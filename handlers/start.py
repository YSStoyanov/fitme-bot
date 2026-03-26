from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart
from aiogram.exceptions import TelegramBadRequest

import database as db
from keyboards.inline import main_menu, back_to_menu
from config import FREE_COINS

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    args = message.text.split()
    ref_by = int(args[1]) if len(args) > 1 and args[1].isdigit() else None

    user = db.get_or_create_user(
        user_id=message.from_user.id,
        username=message.from_user.username or "",
        full_name=message.from_user.full_name or "",
        ref_by=ref_by,
    )

    is_new = user.get("is_new", False)
    balance = user["coins"]

    if is_new:
        text = (
            f"👋 Добре дошли в <b>FitMe</b>!\n\n"
            f"Опитай всяка дреха <b>без да я пробваш</b> — само с две снимки.\n\n"
            f"🎁 Получавате <b>{FREE_COINS} безплатни монети</b> за начало!\n"
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
        f"🔗 Реферален линк:\n<code>{ref_link}</code>\n"
        f"<i>Споделете и получете бонус монети!</i>"
    )
    await call.message.edit_text(text, reply_markup=back_to_menu(), parse_mode="HTML")


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
        "• Добро осветление"
    )
    await call.message.edit_text(text, reply_markup=back_to_menu(), parse_mode="HTML")
