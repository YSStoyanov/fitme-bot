import asyncio
import aiohttp
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, BufferedInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

import database as db
from keyboards.inline import quality_keyboard, confirm_keyboard, after_result_keyboard, back_to_menu, main_menu
from services.fashn_api import run_tryon
from config import COST_STANDARD, COST_HD, COST_ULTRA_HD

router = Router()

QUALITY_LABELS = {
    "standard": ("⚡ Стандартно", COST_STANDARD),
    "hd":       ("🔷 HD",         COST_HD),
    "ultra_hd": ("💎 Ultra HD",   COST_ULTRA_HD),
}


class TryOnState(StatesGroup):
    waiting_person  = State()
    waiting_garment = State()
    confirm         = State()


# ── Start flow ─────────────────────────────────────────────────────────────

@router.callback_query(F.data == "tryon_start")
async def cb_tryon_start(call: CallbackQuery, state: FSMContext):
    await state.clear()
    await call.message.edit_text(
        "👤 <b>Стъпка 1 от 3</b>\n\n"
        "Изпратете <b>своя снимка</b>.\n\n"
        "💡 Препоръки:\n"
        "• Цяло тяло — от глава до крака\n"
        "• Прав, светъл фон\n"
        "• Изправена поза",
        reply_markup=back_to_menu(),
        parse_mode="HTML",
    )
    await state.set_state(TryOnState.waiting_person)


# ── Step 1: person photo ───────────────────────────────────────────────────

@router.message(TryOnState.waiting_person, F.photo)
async def step_person_photo(message: Message, state: FSMContext, bot: Bot):
    photo = message.photo[-1]
    file  = await bot.get_file(photo.file_id)
    buf   = await bot.download_file(file.file_path)
    await state.update_data(person_bytes=buf.read())

    await message.answer(
        "👗 <b>Стъпка 2 от 3</b>\n\n"
        "Изпратете <b>снимка на дрехата</b> която искате да пробвате.\n\n"
        "💡 Препоръки:\n"
        "• Дрехата на бял/неутрален фон\n"
        "• Само един артикул\n"
        "• Ясна и рязка снимка",
        reply_markup=back_to_menu(),
        parse_mode="HTML",
    )
    await state.set_state(TryOnState.waiting_garment)


@router.message(TryOnState.waiting_person)
async def step_person_not_photo(message: Message):
    await message.answer("📸 Моля изпратете снимка (не файл или текст).")


# ── Step 2: garment photo ──────────────────────────────────────────────────

@router.message(TryOnState.waiting_garment, F.photo)
async def step_garment_photo(message: Message, state: FSMContext, bot: Bot):
    photo = message.photo[-1]
    file  = await bot.get_file(photo.file_id)
    buf   = await bot.download_file(file.file_path)
    await state.update_data(garment_bytes=buf.read())

    await message.answer(
        "🎚 <b>Стъпка 3 от 3</b>\n\n"
        "Изберете качество на генерацията:",
        reply_markup=quality_keyboard(),
        parse_mode="HTML",
    )
    await state.set_state(TryOnState.confirm)


@router.message(TryOnState.waiting_garment)
async def step_garment_not_photo(message: Message):
    await message.answer("👕 Моля изпратете снимка на дрехата.")


# ── Step 3: quality select ─────────────────────────────────────────────────

@router.callback_query(F.data == "choose_quality", TryOnState.confirm)
async def cb_choose_quality(call: CallbackQuery):
    await call.message.edit_text(
        "🎚 Изберете качество:",
        reply_markup=quality_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("quality_"), TryOnState.confirm)
async def cb_quality_selected(call: CallbackQuery, state: FSMContext):
    quality = call.data.replace("quality_", "")
    label, cost = QUALITY_LABELS[quality]
    balance = db.get_balance(call.from_user.id)

    await state.update_data(quality=quality)

    if balance < cost:
        shortage = cost - balance
        await call.message.edit_text(
            f"❌ <b>Недостатъчно монети</b>\n\n"
            f"Нужни: {cost} | Имате: {balance}\n"
            f"Липсват ви: <b>{shortage} монети</b>",
            reply_markup=back_to_menu(),
            parse_mode="HTML",
        )
        return

    await call.message.edit_text(
        f"✅ <b>Готово за генерация</b>\n\n"
        f"Качество: {label}\n"
        f"Цена: <b>{cost} монети</b>\n"
        f"Баланс след: <b>{balance - cost} монети</b>",
        reply_markup=confirm_keyboard(quality, cost),
        parse_mode="HTML",
    )


# ── Step 4: generate ───────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("confirm_"), TryOnState.confirm)
async def cb_confirm_generate(call: CallbackQuery, state: FSMContext, bot: Bot):
    quality = call.data.replace("confirm_", "")
    _, cost  = QUALITY_LABELS[quality]
    data     = await state.get_data()

    person_bytes  = data.get("person_bytes")
    garment_bytes = data.get("garment_bytes")

    if not person_bytes or not garment_bytes:
        await call.message.edit_text("⚠️ Данните изтекоха. Моля започнете отново.", reply_markup=main_menu())
        await state.clear()
        return

    # deduct coins
    success = db.spend_coins(call.from_user.id, cost, payload=f"tryon_{quality}")
    if not success:
        await call.answer("❌ Недостатъчно монети!", show_alert=True)
        return

    gen_id = db.create_generation(call.from_user.id, quality, cost)
    await state.clear()

    processing_msg = await call.message.edit_text(
        "⏳ <b>Генерирам...</b>\n\nОбикновено отнема 15–30 секунди. Изчакайте.",
        parse_mode="HTML",
    )

    pred_id, result_url = await run_tryon(person_bytes, garment_bytes, quality)

    if not result_url:
        # refund on failure
        db.add_coins(call.from_user.id, cost, 0, "refund_generation_failed")
        db.update_generation(gen_id, "failed", pred_id)
        await bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=processing_msg.message_id,
            text=(
                "❌ <b>Генерацията не успя</b>\n\n"
                f"Монетите ви ({cost}) бяха върнати.\n"
                "Моля опитайте с различни снимки."
            ),
            reply_markup=after_result_keyboard(),
            parse_mode="HTML",
        )
        return

    db.update_generation(gen_id, "done", pred_id, result_url)

    # download and send result
    async with aiohttp.ClientSession() as session:
        async with session.get(result_url) as resp:
            img_bytes = await resp.read()

    await bot.delete_message(call.message.chat.id, processing_msg.message_id)
    await bot.send_photo(
        call.message.chat.id,
        photo=BufferedInputFile(img_bytes, filename="fitme_result.jpg"),
        caption=(
            f"✨ <b>Ето как изглеждате!</b>\n\n"
            f"Качество: {QUALITY_LABELS[quality][0]}\n"
            f"Баланс: <b>{db.get_balance(call.from_user.id)} монети</b>"
        ),
        reply_markup=after_result_keyboard(),
        parse_mode="HTML",
    )
