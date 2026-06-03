import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN     = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
FASHN_API_KEY = os.getenv("FASHN_API_KEY", "YOUR_FASHN_API_KEY_HERE")
ADMIN_IDS     = list(map(int, os.getenv("ADMIN_IDS", "0").split(",")))

# Coin packages: (coins, stars_price, label)
COIN_PACKAGES = [
    (10,  50,  "⚡ Стартов — 10 монети"),
    (50,  199, "🔥 Популярен — 50 монети"),
    (150, 499, "💎 Pro — 150 монети"),
    (500, 999, "👑 Бизнес — 500 монети"),
]

# Generation costs in coins
COST_STANDARD = 3
COST_HD       = 5
COST_ULTRA_HD = 8

# Free coins on /start
FREE_COINS = 3

# Referral: coins given to referrer when referred user makes FIRST purchase
REFERRAL_BONUS = 10

# Daily check-in reward
DAILY_CHECKIN_COINS = 1

DB_PATH = "fitme.db"
