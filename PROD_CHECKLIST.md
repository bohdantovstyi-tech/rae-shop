# Чекліст перед продом (Rae — WayForPay checkout)

Актуально з моменту, коли з'являються реальні клієнтські токени WFP і проєкт іде на прод.
До того бекенд працює на публічному sandbox-акаунті WFP (`test_merch_n1`,
`WFP_TEST_MODE=true`) — див. `.env.example`.

---

## 0. Блокери, які треба зняти першими

- [ ] **Доступ до Netlify-сайту `rae-shop`.** Локально репозиторій прив'язаний до сайту
  `fc857cd2-c4ee-42c1-97e8-bb97272e9d71` (`rae-shop`, `https://rae-shop.netlify.app`), але
  залогінений у `netlify-cli` акаунт (`hello@htotse.com`, команда «Hto tse?») цього сайту
  **не бачить** — `netlify sites:list` повертає лише `punkt-shop`, а будь-який
  API-виклик по сайту Rae дає `Failed retrieving addons for site ...: Not Found`.

  Наслідки: `netlify dev --live` не запускається взагалі (тунелю немає, тож WayForPay не
  може достукатись до `wfp-callback`), і з цього акаунта не вийде виставити env-змінні в
  Netlify UI. Локально все працює лише через `netlify dev --offline`.

  Що зробити: залогінитись в акаунт-власник `rae-shop` (`netlify logout` → `netlify login`)
  або запросити поточний акаунт у команду, якій належить сайт.

- [ ] **Доступи до Brevo-акаунту клієнта Rae** — блокують макро-пункт 9 (темплейт листа).
  Код готовий і без них: без `BREVO_API_KEY` лист просто не надсилається, помилка
  логується, ACK для WFP усе одно повертається.

- [ ] **Валюта не підтверджена.** Зараз у `public/app.js` `WFP_CURRENCY = "USD"`, а
  `ALLOWED_CURRENCIES` у `validate-wfp.js` — `["UAH", "USD", "EUR"]`. Sandbox приймає всі
  три на етапі створення платіжного URL, тож питання вирішує лише кабінет реального
  мерчанта Rae. Проти USD грає `deliveryList = "nova;nova_pl;other"` (Нова пошта) —
  контур виглядає українським. Після підтвердження: змінити константу і **звузити**
  `ALLOWED_CURRENCIES` до фактично увімкнених валют.

---

## 1. Netlify UI → Environment variables (сайт `rae-shop`)

Локальний `.env` у git не потрапляє — прод-значення вносяться вручну в
**Site settings → Environment variables**:

- [ ] `WFP_MERCHANT_ACCOUNT` — реальний клієнтський merchantAccount (замість `test_merch_n1`)
- [ ] `WFP_SECRET_KEY` — реальний live-секрет
- [ ] `WFP_MERCHANT_DOMAIN` — реальний домен, зареєстрований у WFP (без протоколу)
- [ ] `WFP_TEST_MODE=false` — інакше прод підписуватиме sandbox-ключем
- [ ] `WFP_TEST_SECRET_KEY` — лишити для майбутніх sandbox-тестів або прибрати
- [ ] `WFP_SERVICE_URL` = `https://rae-shop.netlify.app/.netlify/functions/wfp-callback`
- [ ] `WFP_RETURN_URL` — сторінка «дякуємо» на Webflow-сайті Rae
- [ ] `CORS_ALLOWED_ORIGIN` — реальний Webflow-домен Rae замість `*`
- [ ] `BREVO_API_KEY`, `BREVO_ORDER_CONFIRMATION_TEMPLATE_ID`, `BREVO_SENDER_EMAIL`,
      `BREVO_SENDER_NAME`
- [ ] `MAKE_WEBHOOK_URL` — лишити порожнім, якщо форвард не потрібен
- [ ] `DEBUG_WFP_CALLBACK` — прибрати або лишити порожнім (не логувати деталі оплат)

`CHECKOUT_ENDPOINT` як env-змінна тут **не потрібна** (на відміну від Punkt): збірки немає,
URL бекенду — константа в `public/app.js`.

## 2. Перевірка коду в репозиторії

- [ ] `CHECKOUT_ENDPOINT` у `public/app.js` вказує на
      `https://rae-shop.netlify.app/.netlify/functions/checkout` — перевірити, що це
      фінальний URL сайту
- [ ] `CART_PAGE_URL` у `public/app.js` — зараз `""`, редірект після додавання в кошик
      свідомо вимкнений (у Rae є модалки кошика). Заповнити, лише якщо редірект вирішать увімкнути
- [ ] `window.RAE_CHECKOUT_ENDPOINT` не встановлюється ніде, крім `test/local-preview.html`
- [ ] Валюта в `public/app.js` збігається з тим, що ввімкнено в кабінеті мерчанта (розділ 0)
- [ ] Селектори з `DOM_HOOKS.md` звірені з фактичною розміткою Webflow-сайту Rae —
      зокрема `.checkout-button` і відсутність дублікатів `#cart-container`

## 3. Передпублікаційні перевірки

- [ ] `npm test` — зелений (зараз 24 тести)
- [ ] Реальна тестова оплата на мінімальну суму на проді: WFP має достукатись до
      `wfp-callback` на прод-домені і не дати `signature mismatch` у логах функцій
- [ ] CORS з реального Webflow-домену після звуження `CORS_ALLOWED_ORIGIN`
- [ ] Сторінка WayForPay показує назви товарів із матеріалом, кольором і розмірами

## 4. Brevo

- [ ] Темплейт «Order confirmation» створений з merge-тегами `orderNumber`, `orderDate`,
      `recipientName`, `phone`, `products`, `total` — і без жодного зайвого.
      Свідомо **немає** `deliveryAddress` (WFP не повертає адресу доставки в callback)
      і блоків наявності/передзамовлення (статус наявності ніде в коді не відстежується)
- [ ] `products` у темплейті — один текстовий блок, а не цикл: `utils/brevo.js` віддає
      готовий рядок, а не масив
- [ ] Відправник верифікований у Brevo
- [ ] Лист реально доходить після тестової оплати

## 5. Критичне відкрите — захист від підміни ціни товару

`netlify/functions/utils/validate-wfp.js` звіряє лише **внутрішню узгодженість** payload
(`amount === sum(productPrice × productCount)`). Це НЕ захист від підробленої ціни: і
`amount`, і `productPrice` походять з одного клієнтського джерела. Покупець може
відредагувати `price` у localStorage перед checkout — обидва значення перерахуються з
підробленого, і перевірка все одно пройде.

Реальний захист потребує серверного джерела правди по цінах: захардкодженої мапи
товар → ціна в Netlify Function або запиту до Webflow CMS API. Зараз такого немає.

**Обов'язково закрити до запуску з реальними платежами.** У межах поточної задачі
свідомо не реалізується (рішення зафіксоване в `MACRO_PLAN.md`).
