# Чекліст перед продом (Rae — WayForPay checkout)

Актуально з моменту, коли з'являються реальні клієнтські токени WFP і проєкт іде на прод.
До того бекенд працює на sandbox-акаунті WFP з `WFP_TEST_MODE=true` — див. `.env.example`.

> Статус: **скелет**. Фінально заповнюється у макро-пункті 10 плану (`MACRO_PLAN.md`).

## 1. Netlify UI → Environment variables (сайт `rae-shop`)

Локальний `.env` у git не потрапляє — прод-значення вносяться вручну в
**Site settings → Environment variables**:

- [ ] `WFP_MERCHANT_ACCOUNT` — реальний клієнтський merchantAccount
- [ ] `WFP_SECRET_KEY` — реальний live-секрет
- [ ] `WFP_MERCHANT_DOMAIN` — реальний домен, зареєстрований у WFP (без протоколу)
- [ ] `WFP_TEST_MODE=false` — інакше прод підписуватиме sandbox-ключем
- [ ] `WFP_SERVICE_URL` — `https://rae-shop.netlify.app/.netlify/functions/wfp-callback`
- [ ] `WFP_RETURN_URL` — сторінка "дякуємо" на Webflow-сайті Rae
- [ ] `CORS_ALLOWED_ORIGIN` — реальний Webflow-домен Rae замість `*`
- [ ] `BREVO_API_KEY`, `BREVO_ORDER_CONFIRMATION_TEMPLATE_ID`, `BREVO_SENDER_EMAIL`,
      `BREVO_SENDER_NAME`
- [ ] `MAKE_WEBHOOK_URL` — лишити порожнім, якщо форвард не потрібен
- [ ] `DEBUG_WFP_CALLBACK` — прибрати або лишити порожнім (не логувати деталі оплат)

## 2. Перевірка коду в репозиторії

- [ ] `CHECKOUT_ENDPOINT` у `public/app.js` вказує на прод-функцію rae-shop
- [ ] `CART_PAGE_URL` у `public/app.js` заповнений реальним URL сторінки кошика
- [ ] `window.RAE_CHECKOUT_ENDPOINT` не встановлюється ніде, крім `test/local-preview.html`
- [ ] Валюта в `public/app.js` збігається з тим, що ввімкнено в кабінеті мерчанта

## 3. Передпублікаційні перевірки

- [ ] `npm test` — зелений
- [ ] Реальна тестова оплата на мінімальну суму на проді (WFP має достукатись до
      `wfp-callback` на прод-домені)
- [ ] CORS з реального Webflow-домену після звуження `CORS_ALLOWED_ORIGIN`

## 4. Brevo

- [ ] Темплейт "Order confirmation" створений з merge-тегами `orderNumber`, `orderDate`,
      `recipientName`, `phone`, `products`, `total` — і без жодного зайвого
- [ ] Відправник верифікований у Brevo
- [ ] Лист реально доходить після тестової оплати

## 5. Відкрите — захист від підміни ціни товару

`netlify/functions/utils/validate-wfp.js` звіряє лише **внутрішню узгодженість** payload
(`amount === sum(productPrice × productCount)`). Це НЕ захист від підробленої ціни: і
`amount`, і `productPrice` походять з одного клієнтського джерела, тож якщо покупець
змінить `price` у localStorage перед checkout, звірка все одно пройде.

Реальний захист потребує серверного джерела правди по цінах — захардкодженої мапи
товар → ціна в Netlify Function або запиту до Webflow CMS API. Зараз такого немає.

**Обов'язково закрити до запуску з реальними платежами.** У межах поточної задачі
свідомо не реалізується.
