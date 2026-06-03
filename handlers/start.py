from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

import database as db
from keyboards.inline import main_menu, back_to_menu, cancel_keyboard
from config import FREE_COINS, DAILY_CHECKIN_COINS

router = Router()


class PromoState(StatesGroup):
    waiting_code = State()


@router.message(CommandStart())
async def cmd_start(message: Message):
    args = message.text.split()
    ref_by = int(args[1]) if len(args) > 1 and args[1].isdigit() else None

    # Don't allow self-referral
    if ref_by == message.from_user.id:
        ref_by = None

    user = db.get_or_create_user(
        user_id=message.from_user.id,
        username=message.from_user.username or "",
        full_name=message.from_user.full_name or "",
        ref_by=ref_by,
    )

    is_new = user.get("is_new", False)
    balance = user["coins"]

    if is_new:
        ref_text = "\n🤝 Поканен от приятел — вашият приятел ще получи бонус при първата ви покупка!" if ref_by else ""
        text = (
            f"👋 Добре дошли в <b>FitMe</b>!\n\n"
            f"Опитай всяка дреха <b>без да я пробваш</b> — само с две снимки.\n\n"
            f"🎁 Получавате <b>{FREE_COINS} безплатни монети</b> за начало!{ref_text}\n"
            f"💰 Баланс: <b>{balance} монети</b>"
        )
    else:
        text = (
            f"👋 Добре дошли обратно!\n"
            f"💰 Баланс: <b>{balance} монети</b>"
        )

    await message.answer(text, reply_markup=main_menu(), parse_mode="HTML")


@router.callback_query(F.data == "main_menu")
async def cb_main_menu(call: CallbackQuery):
    balance = db.get_balance(call.from_user.id)
    try:
        await call.message.edit_text(
            f"🏠 <b>Главно меню</b>\n💰 Баланс: <b>{balance} монети</b>",
            reply_markup=main_menu(),
            parse_mode="HTML",
        )
    except TelegramBadRequest:
        pass
    await call.answer()


@router.callback_query(F.data == "profile")
async def cb_profile(call: CallbackQuery):
    user = db.get_user(call.from_user.id)
    if not user:
        await call.answer("Грешка. Напишете /start")
        return

    ref_link = f"https://t.me/FitMeBot?start={user['user_id']}"
    text = (
        f"👤 <b>Профил</b>\n\n"
        f"💰 Монети: <b>{user['coins']}</b>\n"
        f"🖼 Генерации: <b>{user['total_gens']}</b>\n\n"
        f"🔗 <b>Реферален линк:</b>\n<code>{ref_link}</code>\n\n"
        f"<i>Споделете линка — получавате <b>{DAILY_CHECKIN_COINS * 10} монети</b> "
        f"при всяка покупка на поканен приятел!</i>"
    )
    await call.message.edit_text(text, reply_markup=back_to_menu(), parse_mode="HTML")
    await call.answer()


@router.callback_query(F.data == "how_it_works")
async def cb_how_it_works(call: CallbackQuery):
    text = (
        "❓ <b>Как работи FitMe?</b>\n\n"
        "1️⃣ Натиснете <b>Опитай дреха</b>\n"
        "2️⃣ Изпратете <b>своя снимка</b> (цяло тяло)\n"
        "3️⃣ Изпратете <b>снимка на дрехата</b>\n"
        "4️⃣ Изберете качество и генерирайте\n"
        "5️⃣ Получете резултата за секунди!\n\n"
        "💡 <b>Съвет:</b> По-добра снимка = по-добър резултат\n"
        "• Прав фон\n"
        "• Цяло тяло видимо\n"
        "• Добро осветление\n\n"
        "🎁 <b>Безплатни монети:</b>\n"
        "• 📅 Дневен бонус — 1 монета/ден\n"
        "• 🤝 Реферал — 10 монети при покупка на приятел\n"
        "• 🎁 Промо кодове — следете каналa ни"
    )
    await call.message.edit_text(text, reply_markup=back_to_menu(), parse_mode="HTML")
    await call.answer()


# ── Daily check-in ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "daily_checkin")
async def cb_daily_checkin(call: CallbackQuery):
    claimed = db.claim_daily_checkin(call.from_user.id, DAILY_CHECKIN_COINS)
    balance = db.get_balance(call.from_user.id)

    if claimed:
        await call.message.edit_text(
            f"📅 <b>Дневен бонус!</b>\n\n"
            f"✅ Получихте <b>{DAILY_CHECKIN_COINS} монета</b>!\n"
            f"💰 Нов баланс: <b>{balance} монети</b>\n\n"
            f"<i>Върнете се утре за нова монета.</i>",
            reply_markup=back_to_menu(),
            parse_mode="HTML",
        )
    else:
        await call.message.edit_text(
            f"📅 <b>Дневен бонус</b>\n\n"
            f"⏰ Вече сте взели бонуса си за днес.\n"
            f"💰 Баланс: <b>{balance} монети</b>\n\n"
            f"<i>Върнете се утре!</i>",
            reply_markup=back_to_menu(),
            parse_mode="HTML",
        )
    await call.answer()


# ── Promo codes ──────────────────────────────────────────────────────────────

@router.callback_query(F.data == "promo_code")
async def cb_promo_code(call: CallbackQuery, state: FSMContext):
    await call.message.edit_text(
        "🎁 <b>Промо код</b>\n\n"
        "Въведете вашия промо код:",
        reply_markup=cancel_keyboard(),
        parse_mode="HTML",
    )
    await state.set_state(PromoState.waiting_code)
    await call.answer()


@router.message(PromoState.waiting_code)
async def handle_promo_code(message: Message, state: FSMContext):
    code = message.text.strip() if message.text else ""
    await state.clear()

    if not code:
        await message.answer("❌ Невалиден код.", reply_markup=back_to_menu())
        return

    success, msg, coins = db.redeem_promo_code(message.from_user.id, code)
    balance = db.get_balance(message.from_user.id)

    if success:
        await message.answer(
            f"🎁 <b>Промо код активиран!</b>\n\n"
            f"{msg}\n"
            f"💰 Нов баланс: <b>{balance} монети</b>",
            reply_markup=main_menu(),
            parse_mode="HTML",
        )
    else:
        await message.answer(
            f"❌ <b>{msg}</b>\n\n"
            f"💰 Баланс: <b>{balance} монети</b>",
            reply_markup=back_to_menu(),
            parse_mode="HTML",
        )


@router.message(Command("promo"))
async def cmd_promo(message: Message, state: FSMContext):
    """Allow users to redeem promo code via /promo <code>"""
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer(
            "🎁 Въведете промо код:\n<code>/promo ВАШКОД</code>",
            parse_mode="HTML",
        )
        return

    code = parts[1].strip()
    success, msg, coins = db.redeem_promo_code(message.from_user.id, code)
    balance = db.get_balance(message.from_user.id)

    if success:
        await message.answer(
            f"🎁 <b>Промо код активиран!</b>\n\n"
            f"{msg}\n"
            f"💰 Нов баланс: <b>{balance} монети</b>",
            reply_markup=main_menu(),
            parse_mode="HTML",
        )
    else:
        await message.answer(
            f"❌ <b>{msg}</b>\n💰 Баланс: <b>{balance} монети</b>",
            reply_markup=back_to_menu(),
            parse_mode="HTML",
        )
