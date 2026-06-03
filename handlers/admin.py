import asyncio
import logging
from aiogram import Router, Bot
from aiogram.types import Message
from aiogram.filters import Command

import database as db
from config import ADMIN_IDS

router = Router()
logger = logging.getLogger(__name__)


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
        f"🤝 Реферали наградени: <b>{s['referrals']}</b>\n"
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


@router.message(Command("createpromo"))
async def cmd_create_promo(message: Message):
    """Usage: /createpromo <code> <coins> [max_uses]
    max_uses=0 means unlimited.
    """
    if not is_admin(message.from_user.id):
        return

    parts = message.text.split()
    if len(parts) < 3 or not parts[2].isdigit():
        await message.answer("Употреба: /createpromo <КОД> <монети> [макс_употреби]")
        return

    code     = parts[1].upper()
    coins    = int(parts[2])
    max_uses = int(parts[3]) if len(parts) >= 4 and parts[3].isdigit() else 0

    success = db.create_promo_code(code, coins, max_uses)
    if success:
        uses_text = f"до {max_uses} пъти" if max_uses > 0 else "неограничено"
        await message.answer(
            f"✅ <b>Промо код създаден!</b>\n\n"
            f"Код: <code>{code}</code>\n"
            f"Монети: <b>{coins}</b>\n"
            f"Употреби: <b>{uses_text}</b>",
            parse_mode="HTML",
        )
    else:
        await message.answer(f"❌ Код <code>{code}</code> вече съществува.", parse_mode="HTML")


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, bot: Bot):
    """Usage: /broadcast <message text>
    Sends a message to all users. Use carefully.
    """
    if not is_admin(message.from_user.id):
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Употреба: /broadcast <текст>")
        return

    text = parts[1]
    user_ids = db.get_all_user_ids()

    sent = 0
    failed = 0
    status_msg = await message.answer(f"📢 Изпращам до {len(user_ids)} потребители...")

    for uid in user_ids:
        try:
            await bot.send_message(uid, text, parse_mode="HTML")
            sent += 1
        except Exception:
            failed += 1
        await asyncio.sleep(0.05)  # Stay within Telegram rate limits

    await status_msg.edit_text(
        f"📢 <b>Broadcast завършен</b>\n\n"
        f"✅ Изпратено: <b>{sent}</b>\n"
        f"❌ Неуспешно: <b>{failed}</b>",
        parse_mode="HTML",
    )
    logger.info("Broadcast sent: %d ok, %d failed", sent, failed)
