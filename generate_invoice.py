#!/usr/bin/env python3
"""
Скрипт для генерации инвойса Telegram Stars
"""

import requests
import json
import sys

def create_invoice_link(bot_token):
    """Создает инвойс для Telegram Stars"""
    
    url = f"https://api.telegram.org/bot{8153174551:AAEBDjT04MrE2a6F85FWBWzTSFVxEINJ2j8}/createInvoiceLink"
    
    payload = {
        "title": "Daily Tracker Premium",
        "description": "Шаблоны + продвинутая аналитика + экспорт отчетов",
        "payload": "premium_100_stars",
        "provider_token": "",
        "currency": "XTR",
        "prices": [
            {
                "label": "Premium доступ",
                "amount": 100
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("ok"):
            invoice_url = result["result"]
            print("✅ Инвойс создан успешно!")
            print(f"🔗 Ссылка: {invoice_url}")
            print("\n📝 Вставьте эту ссылку в app.js:")
            print(f"const INVOICE_URL = '{invoice_url}';")
            return invoice_url
        else:
            print("❌ Ошибка создания инвойса:")
            print(result.get("description", "Неизвестная ошибка"))
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка сети: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        return None

def main():
    print("🚀 Генератор инвойса Telegram Stars")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        bot_token = sys.argv[1]
    else:
        bot_token = input("Введите токен бота: ").strip()
    
    if not bot_token:
        print("❌ Токен бота не указан")
        return
    
    print(f"🤖 Используется токен: {bot_token[:10]}...")
    print()
    
    invoice_url = create_invoice_link(bot_token)
    
    if invoice_url:
        print("\n🎉 Готово! Теперь можете тестировать оплату в приложении.")

if __name__ == "__main__":
    main() 