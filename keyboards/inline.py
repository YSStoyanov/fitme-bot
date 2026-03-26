from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import COIN_PACKAGES, COST_STANDARD, COST_HD, COST_ULTRA_HD


def main_menu() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="👗 Опитай дреха",    callback_data="tryon_start")
    kb.button(text="💰 Купи монети",      callback_data="buy_coins")
    kb.button(text="👤 Профил",           callback_data="profile")
    kb.button(text="❓ Как работи",       callback_data="how_it_works")
    kb.adjust(2)
    return kb.as_markup()


def quality_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=f"⚡ Стандартно  ({COST_STANDARD} монети)",  callback_data="quality_standard")
    kb.button(text=f"🔷 HD  ({COST_HD} монети)",                 callback_data="quality_hd")
    kb.button(text=f"💎 Ultra HD  ({COST_ULTRA_HD} монети)",     callback_data="quality_ultra_hd")
    kb.button(text="← Назад",                                    callback_data="tryon_start")
    kb.adjust(1)
    return kb.as_markup()


def confirm_keyboard(quality: str, cost: int) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=f"✅ Генерирай ({cost} монети)", callback_data=f"confirm_{quality}")
    kb.button(text="← Назад",                       callback_data="choose_quality")
    kb.adjust(1)
    return kb.as_markup()


def after_result_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🔄 Нова генерация",  callback_data="tryon_start")
    kb.button(text="💰 Купи монети",      callback_data="buy_coins")
    kb.button(text="🏠 Главно меню",      callback_data="main_menu")
    kb.adjust(2, 1)
    return kb.as_markup()


def coin_packages_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for i, (coins, stars, label) in enumerate(COIN_PACKAGES):
        kb.button(text=f"{label}  |  ⭐ {stars}", callback_data=f"buy_{i}")
    kb.button(text="← Назад", callback_data="main_menu")
    kb.adjust(1)
    return kb.as_markup()


def back_to_menu() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🏠 Главно меню", callback_data="main_menu")
    return kb.as_markup()
