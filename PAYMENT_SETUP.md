# Настройка оплаты Telegram Stars

## 1. Получение токена бота

1. Найдите вашего бота в @BotFather
2. Отправьте команду `/mybots`
3. Выберите вашего бота
4. Нажмите "API Token" или отправьте `/token`
5. Скопируйте токен (выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Создание инвойса для Stars

Замените `<YOUR_BOT_TOKEN>` на ваш токен и выполните команду:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/createInvoiceLink" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Daily Tracker Premium\",
    \"description\": \"Шаблоны + продвинутая аналитика + экспорт отчетов\",
    \"payload\": \"premium_100_stars\",
    \"provider_token\": \"\",
    \"currency\": \"XTR\",
    \"prices\": [
      {
        \"label\": \"Premium доступ\",
        \"amount\": 100
      }
    ]
  }"
```

## 3. Пример команды с реальным токеном

```bash
curl "https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/createInvoiceLink" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Daily Tracker Premium\",\"description\":\"Шаблоны + продвинутая аналитика + экспорт отчетов\",\"payload\":\"premium_100_stars\",\"provider_token\":\"\",\"currency\":\"XTR\",\"prices\":[{\"label\":\"Premium доступ\",\"amount\":100}]}"
```

## 4. Получение ссылки на инвойс

После выполнения команды вы получите ответ вида:
```json
{
  "ok": true,
  "result": "https://t.me/invoice/abc123def456ghi789"
}
```

## 5. Настройка в приложении

Скопируйте ссылку из поля `result` и вставьте в файл `app.js`:

```javascript
const INVOICE_URL = 'https://t.me/invoice/abc123def456ghi789';
```

## 6. Тестирование оплаты

1. Запустите приложение в Telegram
2. Перейдите на вкладку "Премиум"
3. Нажмите "Купить"
4. Должно открыться окно оплаты Stars

## 7. Обработка платежей

Приложение автоматически:
- Открывает инвойс через `tg.openInvoice()`
- Обрабатывает результат оплаты
- Активирует премиум функции при успешной оплате
- Сохраняет статус в localStorage

## 8. Важные замечания

- **Валюта**: Используется `XTR` (Telegram Stars)
- **Сумма**: 100 Stars = 100 (в копейках)
- **Payload**: Уникальный идентификатор для обработки
- **Provider token**: Оставляем пустым для Stars

## 9. Альтернативный способ (через Bot API)

Если curl не работает, можете использовать онлайн-инструменты:

1. **Postman**: Создайте POST запрос к `https://api.telegram.org/bot<TOKEN>/createInvoiceLink`
2. **Telegram Bot API**: Используйте официальную документацию
3. **Python**: Используйте библиотеку python-telegram-bot

## 10. Проверка статуса

После настройки проверьте:
- [ ] Инвойс создается без ошибок
- [ ] Ссылка открывается в Telegram
- [ ] Оплата проходит успешно
- [ ] Премиум функции активируются
- [ ] Статус сохраняется между сессиями 