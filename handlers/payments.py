import logging
from aiogram import Router, F, Bot
from aiogram.types import (
    CallbackQuery, Message,
    LabeledPrice, PreCheckoutQuery,
)

import database as db
from keyboards.inline import coin_packages_keyboard, back_to_menu, main_menu
from config import COIN_PACKAGES, REFERRAL_BONUS

router = Router()
logger = logging.getLogger(__name__)


@router.callback_query(F.data == "buy_coins")
async def cb_buy_coins(call: CallbackQuery):
    balance = db.get_balance(call.from_user.id)
    text = (
        f"💰 <b>Купи монети</b>\n\n"
        f"Текущ баланс: <b>{balance} монети</b>\n\n"
        f"🤝 <i>Поканете приятел и вземете <b>{REFERRAL_BONUS} монети</b> при неговата покупка!</i>\n\n"
        f"Изберете пакет:"
    )
    await call.message.edit_text(text, reply_markup=coin_packages_keyboard(), parse_mode="HTML")
    await call.answer()


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
        description=f"Получете {coins} монети за AI генерация на дрехи.",
        payload=f"coins_{idx}_{coins}",
        currency="XTR",
        prices=[LabeledPrice(label=label, amount=stars)],
        protect_content=False,
    )
    await call.answer()


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def successful_payment(message: Message, bot: Bot):
    payload = message.successful_payment.invoice_payload
    parts   = payload.split("_")
    coins   = int(parts[2]) if len(parts) >= 3 else 0
    stars   = message.successful_payment.total_amount
    user_id = message.from_user.id

    is_first_purchase = not db.has_made_any_purchase(user_id)

    db.add_coins(user_id, coins, stars, payload)
    balance = db.get_balance(user_id)

    await message.answer(
        f"✅ <b>Плащането е успешно!</b>\n\n"
        f"➕ Добавени: <b>{coins} монети</b>\n"
        f"💰 Нов баланс: <b>{balance} монети</b>",
        reply_markup=main_menu(),
        parse_mode="HTML",
    )

    # Reward referrer on first purchase
    if is_first_purchase:
        user = db.get_user(user_id)
        referrer_id = user.get("ref_by") if user else None
        if referrer_id and referrer_id != user_id:
            rewarded = db.give_referral_bonus(referrer_id, user_id, REFERRAL_BONUS)
            if rewarded:
                logger.info("Referral bonus: %d coins → user %d (referred %d)", REFERRAL_BONUS, referrer_id, user_id)
                try:
                    ref_balance = db.get_balance(referrer_id)
                    await bot.send_message(
                        referrer_id,
                        f"🎉 <b>Реферален бонус!</b>\n\n"
                        f"Вашият приятел направи първата си покупка.\n"
                        f"➕ Получавате <b>{REFERRAL_BONUS} монети</b>!\n"
                        f"💰 Нов баланс: <b>{ref_balance} монети</b>",
                        parse_mode="HTML",
                    )
                except Exception:
                    logger.warning("Could not notify referrer %d", referrer_id)
