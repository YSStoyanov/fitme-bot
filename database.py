import sqlite3
import contextlib
from config import DB_PATH, FREE_COINS


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id     INTEGER PRIMARY KEY,
                username    TEXT,
                full_name   TEXT,
                coins       INTEGER DEFAULT 0,
                total_gens  INTEGER DEFAULT 0,
                ref_by      INTEGER,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER,
                type        TEXT,   -- 'purchase' | 'spend' | 'bonus'
                coins       INTEGER,
                stars       INTEGER DEFAULT 0,
                payload     TEXT,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS generations (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       INTEGER,
                quality       TEXT,
                coins_spent   INTEGER,
                status        TEXT DEFAULT 'pending',
                fashn_id      TEXT,
                result_url    TEXT,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)


# ── Users ──────────────────────────────────────────────────────────────────

def get_or_create_user(user_id: int, username: str, full_name: str, ref_by: int = None) -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            conn.execute(
                "UPDATE users SET username=?, full_name=? WHERE user_id=?",
                (username, full_name, user_id)
            )
            return dict(row)
        conn.execute(
            "INSERT INTO users (user_id, username, full_name, coins, ref_by) VALUES (?,?,?,?,?)",
            (user_id, username, full_name, FREE_COINS, ref_by)
        )
        _log_transaction(conn, user_id, "bonus", FREE_COINS, 0, "welcome_bonus")
        return {"user_id": user_id, "username": username, "full_name": full_name,
                "coins": FREE_COINS, "total_gens": 0, "ref_by": ref_by, "is_new": True}


def get_user(user_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def get_balance(user_id: int) -> int:
    user = get_user(user_id)
    return user["coins"] if user else 0


def add_coins(user_id: int, coins: int, stars: int = 0, payload: str = "purchase"):
    with get_conn() as conn:
        conn.execute("UPDATE users SET coins = coins + ? WHERE user_id = ?", (coins, user_id))
        _log_transaction(conn, user_id, "purchase", coins, stars, payload)


def spend_coins(user_id: int, coins: int, payload: str = "generation") -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT coins FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if not row or row["coins"] < coins:
            return False
        conn.execute("UPDATE users SET coins = coins - ?, total_gens = total_gens + 1 WHERE user_id = ?",
                     (coins, user_id))
        _log_transaction(conn, user_id, "spend", -coins, 0, payload)
        return True


# ── Generations ────────────────────────────────────────────────────────────

def create_generation(user_id: int, quality: str, coins_spent: int) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO generations (user_id, quality, coins_spent) VALUES (?,?,?)",
            (user_id, quality, coins_spent)
        )
        return cur.lastrowid


def update_generation(gen_id: int, status: str, fashn_id: str = None, result_url: str = None):
    with get_conn() as conn:
        conn.execute(
            "UPDATE generations SET status=?, fashn_id=?, result_url=? WHERE id=?",
            (status, fashn_id, result_url, gen_id)
        )


# ── Stats (admin) ──────────────────────────────────────────────────────────

def get_stats() -> dict:
    with get_conn() as conn:
        users      = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        gens       = conn.execute("SELECT COUNT(*) FROM generations WHERE status='done'").fetchone()[0]
        revenue    = conn.execute("SELECT COALESCE(SUM(stars),0) FROM transactions WHERE type='purchase'").fetchone()[0]
        today_gens = conn.execute(
            "SELECT COUNT(*) FROM generations WHERE DATE(created_at)=DATE('now') AND status='done'"
        ).fetchone()[0]
        return {"users": users, "total_gens": gens, "total_stars": revenue, "today_gens": today_gens}


# ── Internal ───────────────────────────────────────────────────────────────

def _log_transaction(conn, user_id, ttype, coins, stars, payload):
    conn.execute(
        "INSERT INTO transactions (user_id, type, coins, stars, payload) VALUES (?,?,?,?,?)",
        (user_id, ttype, coins, stars, payload)
    )
