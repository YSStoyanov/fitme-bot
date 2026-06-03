import sqlite3
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
                type        TEXT,
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

            CREATE TABLE IF NOT EXISTS daily_claims (
                user_id    INTEGER,
                claim_date DATE,
                PRIMARY KEY (user_id, claim_date)
            );

            CREATE TABLE IF NOT EXISTS promo_codes (
                code       TEXT PRIMARY KEY,
                coins      INTEGER,
                max_uses   INTEGER DEFAULT 0,
                uses       INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS promo_uses (
                code    TEXT,
                user_id INTEGER,
                PRIMARY KEY (code, user_id)
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
        conn.execute(
            "UPDATE users SET coins = coins - ?, total_gens = total_gens + 1 WHERE user_id = ?",
            (coins, user_id)
        )
        _log_transaction(conn, user_id, "spend", -coins, 0, payload)
        return True


# ── Referrals ──────────────────────────────────────────────────────────────

def has_made_any_purchase(user_id: int) -> bool:
    """True if user has ever bought a coin package."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM transactions WHERE user_id=? AND type='purchase' "
            "AND payload NOT LIKE 'referral%' AND payload NOT LIKE 'admin%' LIMIT 1",
            (user_id,)
        ).fetchone()
        return row is not None


def give_referral_bonus(referrer_id: int, referred_id: int, bonus: int) -> bool:
    """Award bonus coins to referrer. Safe to call multiple times — only runs once per referral."""
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT 1 FROM transactions WHERE user_id=? AND payload=?",
            (referrer_id, f"referral_bonus_{referred_id}")
        ).fetchone()
        if existing:
            return False
        conn.execute("UPDATE users SET coins = coins + ? WHERE user_id = ?", (bonus, referrer_id))
        _log_transaction(conn, referrer_id, "bonus", bonus, 0, f"referral_bonus_{referred_id}")
        return True


# ── Daily check-in ──────────────────────────────────────────────────────────

def claim_daily_checkin(user_id: int, coins: int) -> bool:
    """Try to claim daily check-in reward. Returns True if claimed, False if already done today."""
    with get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO daily_claims (user_id, claim_date) VALUES (?, DATE('now'))",
                (user_id,)
            )
            conn.execute("UPDATE users SET coins = coins + ? WHERE user_id = ?", (coins, user_id))
            _log_transaction(conn, user_id, "bonus", coins, 0, "daily_checkin")
            return True
        except sqlite3.IntegrityError:
            return False


# ── Promo codes ─────────────────────────────────────────────────────────────

def create_promo_code(code: str, coins: int, max_uses: int = 0) -> bool:
    """Create a promo code. max_uses=0 means unlimited."""
    with get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO promo_codes (code, coins, max_uses) VALUES (?,?,?)",
                (code.upper(), coins, max_uses)
            )
            return True
        except sqlite3.IntegrityError:
            return False


def redeem_promo_code(user_id: int, code: str) -> tuple[bool, str, int]:
    """
    Try to redeem a promo code.
    Returns (success, message, coins_gained).
    """
    code = code.upper().strip()
    with get_conn() as conn:
        promo = conn.execute(
            "SELECT * FROM promo_codes WHERE code=?", (code,)
        ).fetchone()
        if not promo:
            return False, "Невалиден промо код.", 0

        used = conn.execute(
            "SELECT 1 FROM promo_uses WHERE code=? AND user_id=?",
            (code, user_id)
        ).fetchone()
        if used:
            return False, "Вече сте използвали този код.", 0

        if promo["max_uses"] > 0 and promo["uses"] >= promo["max_uses"]:
            return False, "Промо кодът е изтекъл.", 0

        conn.execute("UPDATE promo_codes SET uses = uses + 1 WHERE code=?", (code,))
        conn.execute("INSERT INTO promo_uses (code, user_id) VALUES (?,?)", (code, user_id))
        conn.execute("UPDATE users SET coins = coins + ? WHERE user_id = ?", (promo["coins"], user_id))
        _log_transaction(conn, user_id, "bonus", promo["coins"], 0, f"promo_{code}")
        return True, f"✅ Успешно! Получихте <b>{promo['coins']} монети</b>.", promo["coins"]


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
        referrals  = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE payload LIKE 'referral_bonus_%'"
        ).fetchone()[0]
        return {
            "users": users, "total_gens": gens, "total_stars": revenue,
            "today_gens": today_gens, "referrals": referrals,
        }


def get_all_user_ids() -> list[int]:
    with get_conn() as conn:
        rows = conn.execute("SELECT user_id FROM users").fetchall()
        return [r[0] for r in rows]


# ── Internal ───────────────────────────────────────────────────────────────

def _log_transaction(conn, user_id, ttype, coins, stars, payload):
    conn.execute(
        "INSERT INTO transactions (user_id, type, coins, stars, payload) VALUES (?,?,?,?,?)",
        (user_id, ttype, coins, stars, payload)
    )
