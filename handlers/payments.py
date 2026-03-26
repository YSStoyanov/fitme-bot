from aiogram import Router, F, Bot
from aiogram.types import (
    CallbackQuery, Message,
    LabeledPrice, PreCheckoutQuery,
)

import database as db
from keyboards.inline import coin_packages_keyboard, back_to_menu, main_menu
from config import COIN_PACKAGES

router = Router()


@router.callback_query(F.data == "buy_coins")
async def cb_buy_coins(call: CallbackQuery):
    balance = db.get_balance(call.from_user.id)
    text = (
        f"💰 <b>Купи монети</b>\n\n"
        f"Текущ баланс: <b>{balance} монети</b>\n\n"
        f"Изберете пакет:"
    )
    await call.message.edit_text(text, reply_markup=coin_packages_keyboard(), parse_mode="HTML")


@router.callback_query(F.data.startswith("buy_"))
async def cb_buy_package(call: CallbackQuery, bot: Bot):
    idx = int(call.data.replace("buy_", ""))
    if idx >= len(COIN_PACKAGES):
        await call.answer("Невалиден пакет")
        return

    coins, stars, label = COIN_PACKAGES[idx]

    await bot.send_invoice(
        chat_id=call.message.chat.id,
        title=f"FitMe — {label}",
        description=f"Получете {coins} монети за генерация на снимки.",
        payload=f"coins_{idx}_{coins}",
        currency="XTR",               # Telegram Stars
        prices=[LabeledPrice(label=label, amount=stars)],
        protect_content=False,
    )
    await call.answer()


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    """Always approve — validation already done above."""
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message):
    payload = message.successful_payment.invoice_payload
    parts   = payload.split("_")          # coins_{idx}_{amount}
    coins   = int(parts[2]) if len(parts) >= 3 else 0
    stars   = message.successful_payment.total_amount

    db.add_coins(message.from_user.id, coins, stars, payload)

    balance = db.get_balance(message.from_user.id)
    await message.answer(
        f"✅ <b>Плащането е успешно!</b>\n\n"
        f"➕ Добавени: <b>{coins} монети</b>\n"
        f"💰 Нов баланс: <b>{balance} монети</b>",
        reply_markup=main_menu(),
        parse_mode="HTML",
    )
