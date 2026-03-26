from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command

import database as db
from config import ADMIN_IDS

router = Router()


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


@router.message(Command("stats"))
async def cmd_stats(message: Message):
    if not is_admin(message.from_user.id):
        return

    s = db.get_stats()
    await message.answer(
        f"📊 <b>Статистика FitMe</b>\n\n"
        f"👥 Потребители: <b>{s['users']}</b>\n"
        f"🖼 Генерации общо: <b>{s['total_gens']}</b>\n"
        f"📅 Днес: <b>{s['today_gens']}</b>\n"
        f"⭐ Приходи (Stars): <b>{s['total_stars']}</b>",
        parse_mode="HTML",
    )


@router.message(Command("addcoins"))
async def cmd_addcoins(message: Message):
    """Usage: /addcoins <user_id> <amount>"""
    if not is_admin(message.from_user.id):
        return

    parts = message.text.split()
    if len(parts) != 3 or not parts[1].isdigit() or not parts[2].isdigit():
        await message.answer("Употреба: /addcoins <user_id> <amount>")
        return

    user_id = int(parts[1])
    amount  = int(parts[2])
    db.add_coins(user_id, amount, 0, "admin_grant")
    await message.answer(f"✅ Добавени {amount} монети на {user_id}")
