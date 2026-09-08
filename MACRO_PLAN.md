# Задача для Claude: перенесення архітектури Punkt cart & checkout у проєкт Rae

## Context

Проєкт **Punkt** (`/Users/admin_1/Desktop/Otse.design/Punkt/punkt cart and checkout`) — це
відпрацьована архітектура кошика та checkout для Webflow-сайту: vanilla JS у localStorage,
Netlify Functions для WayForPay Purchase (HMAC-підпис лише на бекенді), webhook `serviceUrl`
з перевіркою підпису та відправкою листа через Brevo Transactional API.

Проєкт **Rae** (цей репозиторій, `bohdantovstyi-tech/rae-shop`) — онлайн-магазин столиків
на Webflow. Кошик тут уже працює коректно (`public/app.js`) і, на відміну від Punkt,
зберігає більше конфігурацій товару: `color`, `colorSample`, `material`, `height`, `radius`.
Бекенд Rae — застаріла копія ранньої ітерації Punkt (ще з часів Saule): `checkout.js` без
валідації й без test-mode перемикача, `callback.js` з захардкодженим чужим Make-вебхуком
і без Brevo.

**Мета:** привести Rae до тієї самої архітектури й рівня надійності, що й Punkt, зберігши
робочу логіку кошика, і довести до повного тестового checkout-флоу на sandbox-токенах
WayForPay. Прод-токени клієнта підставляються пізніше через Netlify env. Callback від WFP
тестується після отримання доступів до Brevo-акаунту й темплейту клієнта Rae.

## Рішення, ухвалені до планування

| Питання | Рішення |
|---|---|
| Структура фронтенду | Лишити `public/app.js` як є, `publish = "public"`. Не переносити в `src/frontend/` + Parcel |
| Інфраструктура | Окремий Netlify-сайт для Rae + окремий Brevo-акаунт клієнта Rae |
| Конфігурації товару (колір/матеріал/розміри) | Вшивати у `productName` одним рядком |
| Захист від підміни ціни | Повторити поведінку Punkt як є, TODO перенести в `PROD_CHECKLIST.md` без реалізації |

**Наслідок першого рішення:** Rae не отримує Parcel-збірки й `src/frontend/utils/*`, тож
юніт-тести фронтенду (як `wfp.test.js` у Punkt) неможливі без бандлера. Замість цього
юніт-тестами покриваємо бекенд-утиліти, де сконцентрована критична логіка (підпис, валідація,
формування params Brevo). Це свідоме відхилення від Punkt на користь збереження робочого
кошика — див. макро-пункт 7.

## Правила роботи

- Джерело-зразок для портування: `/Users/admin_1/Desktop/Otse.design/Punkt/punkt cart and checkout`.
  Читати звідти напряму, не вигадувати логіку заново.
- Мова коментарів у коді — українська (як у Punkt), назви змінних — англійські.
- Commit-повідомлення: `type: короткий опис` (`feat:`, `fix:`, `refactor:`, `chore:`).
  Комітити після кожного макро-пункту, не накопичувати.
- **Ніколи не пушити напряму в `main`. Перед будь-яким `git push` питати підтвердження.**
- Нові npm-пакети, окрім `vitest`, — тільки з дозволу.
- Секрети (`.env`) не комітити ніколи.

---

# Макро-пункт 1. Документація й базові конвенції проєкту Rae

**Мета:** дати проєкту той самий документальний контур, що є в Punkt, адаптований під
стек Rae (без збірки, з конфігураціями товару, з окремим Brevo).

### 1.1. `CLAUDE.md` у корені Rae

Зразок: `Punkt/CLAUDE.md`. Скопіювати структуру розділів, переписати зміст під Rae.
Обов'язкові розділи:

- **Опис проєкту** — кастомний JS кошика та checkout для Webflow-сайту Rae (столики).
  Не SPA, не React. Ключова відмінність від Punkt: товар має конфігурації
  (колір, матеріал, висота, радіус).
- **Стек і залежності** — GitHub `bohdantovstyi-tech/rae-shop` → Netlify, Netlify Functions,
  WayForPay, Brevo Transactional Email API, vanilla JS ES-модулі, `netlify-cli`, `vitest`.
  Явно зафіксувати: **збірки немає**, `public/` публікується як є.
- **Структура репозиторію** — дерево після завершення всіх макро-пунктів (див. нижче).
- **Frontend-конвенції** — уся логіка в `public/app.js`; файл віддається Netlify як
  статика й підключається у Webflow як `<script src="https://<site>.netlify.app/app.js">`.
- **Backend-конвенції** — кожна функція окремим файлом; HMAC рахується лише на бекенді;
  CORS обов'язковий для `fetch` з Webflow-домену; `WFP_TEST_MODE` синхронізує секрет
  між `checkout.js` і `wfp-callback.js`.
- **Env-змінні** — посилання на `.env.example`.
- **Локальна розробка** — `npm run dev`, тунель, `test/local-preview.html`.
- **Деплой** — push у `main` → Netlify.
- **Відкриті питання / TODO** — заповнюється в макро-пункті 10.

Цільове дерево репозиторію, яке треба описати в `CLAUDE.md`:

```
rae-shop-codebase/
├── CLAUDE.md
├── MACRO_PLAN.md
├── PROD_CHECKLIST.md
├── DOM_HOOKS.md
├── .env.example
├── netlify.toml
├── package.json
├── scripts/
│   └── dev.sh
├── public/
│   ├── app.js              # уся логіка кошика та checkout
│   ├── app.css
│   └── index.html
├── netlify/
│   └── functions/
│       ├── checkout.js
│       ├── wfp-callback.js
│       └── utils/
│           ├── validate-wfp.js
│           ├── wfp-signature.js
│           ├── brevo.js
│           ├── validate-wfp.test.js
│           ├── wfp-signature.test.js
│           └── brevo.test.js
└── test/
    └── local-preview.html
```

### 1.2. `.env.example`

Порт `Punkt/.env.example` з коментарями українською. Змінні:

```
WFP_MERCHANT_ACCOUNT=
WFP_MERCHANT_DOMAIN=          # без протоколу
WFP_SERVICE_URL=              # прод/тунель URL wfp-callback
WFP_RETURN_URL=               # НОВЕ порівняно з Punkt — сторінка "дякуємо" на Webflow
WFP_SECRET_KEY=
WFP_TEST_SECRET_KEY=
WFP_TEST_MODE=false
BREVO_API_KEY=
BREVO_ORDER_CONFIRMATION_TEMPLATE_ID=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
CORS_ALLOWED_ORIGIN=          # порожньо = "*"
MAKE_WEBHOOK_URL=             # порожньо = форвард вимкнено
DEBUG_WFP_CALLBACK=           # "1" = увімкнути дебаг-лог
```

**Важлива відмінність від Punkt:** `CHECKOUT_ENDPOINT` тут **не потрібен** як env, бо в Rae
немає Parcel і нема кому підставити його в бандл. URL бекенду прописується константою
в `public/app.js` (див. крок 6.3).

### 1.3. `PROD_CHECKLIST.md`

Зразок: `Punkt/PROD_CHECKLIST.md`. Скелет заповнюється зараз, фінально — у макро-пункті 10.
Розділи: env у Netlify UI, перевірка коду, передпублікаційні перевірки, Brevo,
підміна ціни (критичний відкритий пункт).

### 1.4. `DOM_HOOKS.md` — довідник хуків Webflow

Цього документа в Punkt немає, а Rae без нього незручний: хуків удвічі більше.
Виписати з `public/app.js` усе, що скрипт очікує знайти в розмітці Webflow:

| Категорія | Хук |
|---|---|
| Картка товару | `.product` з `data-name`, `data-price`, `data-img-src`, `data-product-page`, `data-product-height`, `data-product-radius`, `data-product-material`, `data-product-color`, `data-product-color-sample` |
| Обгортка товару | `[data-item="product-wrapper"]` |
| Вибір конфігурації | `input[name="product-material"]` з `data-material`; `input[name="product-color"]` з `data-color` і `data-color-sample` |
| Додавання | `.js-add-to-cart` |
| Кошик | `#cart-container`, `.cart-bottom`, `.checkout-cost`, `.summary-product[data-index]` |
| Кількість | `.plus-btn`, `.minus-btn`, `.remove-btn`, `.quantity` |
| Лічильник у хедері | `.cart-total-quantity` |
| Модалки | `#cart-global-el`, `#cart-global-toggle-btn`, `#cart-global-main`, `[data-cart-global-button="close"]`, `#cart-product-toggle-btn`, `#cart-product-main`, `[data-cart-product-button="close"]`, `#cart-product-total-el` |
| Оформлення | `.checkout-button` (і `.checkout-button-empty` у порожньому кошику) |

Позначити, що ці селектори — контракт із Webflow: зміна класу в Webflow ламає скрипт мовчки.

### 1.5. Коміт

`docs: додано CLAUDE.md, PROD_CHECKLIST.md, DOM_HOOKS.md та .env.example`

**Готовність макро-пункту 1:** чотири документи в репозиторії, `.env.example` покриває всі
змінні, які реально читаються в коді після пункту 5.

---

# Макро-пункт 2. Залежності, скрипти, конфіг Netlify

**Мета:** інфраструктура рівня Punkt, без зміни способу публікації.

### 2.1. Вирішити долю Parcel

Зараз у `package.json` є `parcel` у dependencies і скрипти `start`/`build`, які збирають
`public/app.js` у `dist/`. Але `netlify.toml` публікує `public/`, тобто **результат збірки
нікуди не використовується** — Webflow тягне сирий `public/app.js`.

Дія: прибрати `parcel` із залежностей і видалити скрипти `start`/`build`.
Наслідок: `public/app.js` має лишатися валідним самодостатнім скриптом без `import`
(він таким і є — все в одному IIFE через `Webflow.push`).

Якщо під час виконання виявиться, що Parcel десь потрібен — зупинитись і спитати.

### 2.2. `package.json`

```jsonc
{
  "name": "rae-shop",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "dev": "bash scripts/dev.sh"
  },
  "devDependencies": {
    "netlify-cli": "^27.1.1",
    "vitest": "^3.2.7"
  }
}
```

`vitest` — єдиний новий пакет, він уже погоджений. Після правки — `npm install`.

### 2.3. `netlify.toml`

Прибрати закоментований шаблонний блок з коментарями "example netlify.toml".
Цільовий вміст:

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[dev]
  framework = "#static"
  publish = "public"
  functions = "netlify/functions"
```

**Критично:** `functions` має бути явно заданий і в `[dev]`. Зараз його там немає, тож
`netlify dev` може не підхопити функції. `command` у `[build]` не потрібен — збірки немає.

### 2.4. `.gitignore`

Додати до наявного: `deno.lock`, `.playwright-mcp/`. Звірити з `Punkt/.gitignore`.
Переконатись, що `.env`, `.netlify/`, `node_modules/` уже ігноруються (вони ігноруються).

### 2.5. `scripts/dev.sh`

Зразок `Punkt/scripts/dev.sh`, але **без** `parcel watch` — збірки немає:

```bash
#!/usr/bin/env bash
# Локальна розробка: netlify dev --live (функції + статика public/ + публічний тунель)
set -e
netlify dev --live
```

Зробити файл виконуваним (`chmod +x scripts/dev.sh`).

### 2.6. Перевірити прив'язку до Netlify

`netlify status` — підтвердити, що репозиторій прив'язаний до **окремого сайту Rae**
(`.netlify/state.json` містить `siteId`, але назву сайту треба побачити явно).
Записати назву сайту й прод-URL у `CLAUDE.md`. Якщо прив'язки немає або вона вказує на
чужий сайт — зупинитись і спитати, не робити `netlify link` наосліп.

### 2.7. Коміт

`chore: прибрано Parcel, додано vitest, виправлено netlify.toml і dev-скрипт`

**Готовність макро-пункту 2:** `npm test` запускається (нехай і без тестів),
`npm run dev` піднімає `netlify dev`, у логу видно завантажені функції
`checkout` і `callback`.

---

# Макро-пункт 3. Бекенд-утиліти

**Мета:** створити `netlify/functions/utils/`, якої в Rae ще немає.

### 3.1. `netlify/functions/utils/validate-wfp.js`

Порт `Punkt/netlify/functions/utils/validate-wfp.js` **без змін логіки**. Експорт:
`export function validateWfpPayload(wfp)` → масив рядків-помилок (порожній = валідно).

Перевірки:
1. `amount` — скінченне число `> 0`.
2. `currency` — з `ALLOWED_CURRENCIES`.
3. Для кожного `productPrice[i]` — скінченне `> 0`; паралельно накопичується
   `pricesSum += price × count`.
4. Для кожного `productCount[i]` — ціле `> 0`.
5. Якщо помилок ще немає — `|pricesSum − amount| ≤ 0.01`, інакше помилка
   `"amount does not match sum(productPrice × productCount)"`.

`ALLOWED_CURRENCIES` — узгодити з рішенням про валюту (див. макро-пункт 6, крок 6.7).
Поки валюта не підтверджена — лишити `["UAH", "USD", "EUR"]` як у Punkt.

Зберегти коментар-попередження зверху файлу: ця перевірка ловить неузгоджені дані,
а **не** підміну ціни товару.

### 3.2. `netlify/functions/utils/wfp-signature.js` — нове, немає в Punkt

Винести обчислення підпису в чисті функції, щоб їх можна було покрити тестами
(у Punkt ця логіка вбудована в `checkout.js` і тому не тестується).

```js
export function buildPurchaseBaseString({ merchantAccount, merchantDomainName,
  orderReference, orderDate, amount, currency, productName, productCount, productPrice })
```
→ `;`-joined рядок у **строгому порядку WFP**:
`merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;<усі productName>;<усі productCount>;<усі productPrice>`.
Увага: спочатку **counts**, потім **prices** — не переплутати.

```js
export function buildCallbackBaseString(data)
```
→ `merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode`.

```js
export function buildAckBaseString(orderReference, status, time)
```
→ `orderReference;status;time`.

```js
export function hmacMd5Hex(message, secret)
```
→ `crypto.createHmac("md5", secret).update(message, "utf8").digest("hex")`.

```js
export function resolveWfpSecret(env = process.env)
```
→ `env.WFP_TEST_MODE === "true" ? env.WFP_TEST_SECRET_KEY : env.WFP_SECRET_KEY`.
Ця функція — єдине джерело правди про перемикач режиму; обидві функції мають її викликати,
щоб підписи не розійшлися.

### 3.3. `netlify/functions/utils/brevo.js`

Порт `Punkt/netlify/functions/utils/brevo.js`. Одна зміна порівняно з оригіналом:
**експортувати** `formatProducts` і `formatOrderDate` (у Punkt вони приватні), щоб покрити
тестами в кроці 7.3.

- `BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"`.
- `sendTransactionalEmail({ to, templateId, params, sender })` — кидає помилку, якщо немає
  `BREVO_API_KEY`, `templateId` або `to.email`. Заголовки: `Content-Type`, `Accept`,
  `api-key`. Тіло: `{ to: [{email, name}], templateId: Number(templateId), params, sender? }`.
- `formatProducts(items)` → `"Назва ×2 — 1200, Інша ×1 — 800"`.
- `formatOrderDate(createdDate)` → unix-секунди → `toLocaleDateString("uk-UA")`, `""` якщо
  значення відсутнє.
- `sendOrderConfirmationEmail({ to, recipientName, phone, orderReference, createdDate,
  amount, currency, items })` → params:
  `{ orderNumber, orderDate, recipientName, phone, products, total }`.
  Без `deliveryAddress` — WFP не повертає адресу доставки в callback.

Оскільки конфігурації товару вшиті в `productName` (крок 6.1), `formatProducts` покаже їх
у листі автоматично, без змін структури params.

### 3.4. Коміт

`feat: додано бекенд-утиліти валідації, підпису WFP та клієнта Brevo`

**Готовність макро-пункту 3:** три файли створені, імпортуються без помилок.

---

# Макро-пункт 4. `checkout.js` — приведення до версії Punkt

**Мета:** переписати наявний `netlify/functions/checkout.js` до рівня Punkt плюс
виправити те, що в Punkt лишилось недоробленим (`serviceUrl` / `returnUrl`).

### 4.1. Виправити перемикач секрету — головний баг поточного стану

Зараз `checkout.js` бере `process.env.WFP_SECRET_KEY`, а `callback.js` —
`process.env.WFP_TEST_SECRET_KEY`. Підписи гарантовано розходяться, тож жоден callback
не пройде перевірку.

Замінити на `resolveWfpSecret()` з `utils/wfp-signature.js`. Ту саму функцію використати
в пункті 5. Повідомлення про помилку при відсутності env оновити:
`"Missing env vars: WFP_MERCHANT_ACCOUNT / WFP_MERCHANT_DOMAIN / WFP_SECRET_KEY (or WFP_TEST_SECRET_KEY)"`.

### 4.2. CORS з env

`const allowOrigin = process.env.CORS_ALLOWED_ORIGIN || "*"` замість захардкодженого `"*"`.

### 4.3. Підключити валідацію

Після наявних перевірок (обов'язкові поля, три масиви однакової довжини) додати:

```js
const validationErrors = validateWfpPayload(wfp);
if (validationErrors.length > 0) {
  return { statusCode: 400, headers: cors,
    body: JSON.stringify({ error: "Invalid payload", details: validationErrors }) };
}
```

### 4.4. Узгодити `apiVersion`

Зараз фронт шле `"1"`, бек дефолтить `"2"`. Оскільки фронт передає значення явно,
дефолт беку не спрацьовує, але розбіжність оманлива. Привести дефолт до `"1"` (як у Punkt).

### 4.5. `serviceUrl` і `returnUrl` з env — розширення відносно Punkt

У Punkt ці поля лише прокидаються з клієнта, а клієнт їх не шле, тому **callback ніколи не
викликається**. Це відкритий пункт у `Punkt/PROD_CHECKLIST.md`. У Rae закрити його одразу:

```js
const serviceUrl = process.env.WFP_SERVICE_URL || wfp.serviceUrl || "";
const returnUrl  = process.env.WFP_RETURN_URL  || wfp.returnUrl  || "";
```

і додати їх в `optionalFields`, якщо непорожні. Env має пріоритет над клієнтом — клієнт не
повинен мати змоги перенаправити callback на свій сервер.

**Важливо:** `serviceUrl` і `returnUrl` **не входять** у рядок підпису WFP Purchase.
Не додавати їх у `buildPurchaseBaseString`.

### 4.6. Решту логіки звірити рядок у рядок з Punkt

Не переписувати те, що вже коректне: `baseFields` із перезаписом merchant-полів з env,
підпис через `buildPurchaseBaseString` + `hmacMd5Hex`, список `passthrough`-полів,
offline-запит на `https://secure.wayforpay.com/pay?behavior=offline` з
`application/x-www-form-urlencoded`, і fallback `mode: "form"` з `actionUrl`
`https://secure.wayforpay.com/pay` і ключами масивів у вигляді `productName[]`.

### 4.7. Ручна перевірка

При запущеному `npm run dev`:

```bash
curl -s -X POST http://localhost:8888/.netlify/functions/checkout \
  -H 'Content-Type: application/json' \
  -d '{"provider":"wayforpay","wfp":{"orderReference":"RAE_TEST_1","orderDate":1700000000,
       "amount":"200.00","currency":"UAH","productName":["Table Aria, Oak, Black, 45x60 CM"],
       "productPrice":["100.00"],"productCount":["2"]}}'
```

Очікується `{"success":true,"mode":"offline","payUrl":"https://secure.wayforpay.com/..."}`.

Негативний кейс — `amount` не збігається з сумою (`"999.00"` при `100 × 2`) → 400 з `details`.

### 4.8. Коміт

`fix: checkout.js — синхронізовано секрет з callback, додано валідацію, CORS і serviceUrl`

**Готовність макро-пункту 4:** обидва curl-виклики дають очікуваний результат.

---

# Макро-пункт 5. `wfp-callback.js` — webhook з перевіркою підпису та Brevo

### 5.1. Перейменувати файл

`git mv netlify/functions/callback.js netlify/functions/wfp-callback.js`

Ім'я має збігатися з тим, що підставляється у `WFP_SERVICE_URL` (крок 4.5).
Кінцевий шлях: `/.netlify/functions/wfp-callback`.

### 5.2. Видалити захардкоджений Make-вебхук — питання безпеки

У поточному `callback.js` рядок 178 містить
`const makeUrl = "https://hook.eu2.make.com/hg21lumw8yycmc3g7bm1tq35fnidj8e9"`.
Це чужа автоматизація, успадкована від Punkt/Saule, і зараз вона отримувала б замовлення Rae
разом із персональними даними покупців.

Замінити на `const makeUrl = process.env.MAKE_WEBHOOK_URL || ""` і форвардити лише коли
змінна непорожня.

### 5.3. Дебаг-лог через env

`const DEBUG = process.env.DEBUG_WFP_CALLBACK === "1"` замість `const DEBUG = true`.
Маскування `cardPan` і `authCode` у логах зберегти.

### 5.4. Секрет і перевірка підпису через спільні утиліти

- `const SECRET = resolveWfpSecret()` — та сама функція, що в `checkout.js`.
- Перевірка підпису: `hmacMd5Hex(buildCallbackBaseString(data), SECRET) === merchantSignature`,
  де підпис читається як `data.merchantSignature || data.signature` (WFP шле по-різному).
- Невідповідність логується через `console.warn` з `orderReference`, `expected`, `got`,
  але **запит не відхиляється** — ACK усе одно повертається.

### 5.5. ACK-відповідь

`{ orderReference, status: "accept", time, signature }`, де
`signature = hmacMd5Hex(buildAckBaseString(orderReference, "accept", time), SECRET)`,
`time = Math.floor(Date.now() / 1000)`. Якщо секрету немає — `signature: "no-secret"`.
Заголовок `Content-Type: application/json`.

### 5.6. Відправка листа через Brevo

Порт блоку 6 з `Punkt/netlify/functions/wfp-callback.js`. Умова:
`success && isSignatureValid`, де `success = transactionStatus === "Approved"`.

- Email: `data.email || data.clientEmail`; якщо порожній — `console.warn` і пропуск.
- Ім'я: `[clientFirstName, clientLastName].filter(Boolean).join(" ")`.
- Телефон: `data.phone || data.clientPhone`.
- `items` збирається через хелпер `toArray` (WFP шле масив або скаляр):
  `productNames.map((name, i) => ({ name, count: productCounts[i], price: productPrices[i] }))`.
- Виклик обгорнутий у `try/catch`: помилка Brevo логується і **не блокує ACK**.

### 5.7. `readBodyFlexible` — залишити як є

Логіка читання тіла (base64, JSON, text/plain, form-urlencoded з евристиками на вкладений
JSON і на JSON у ключі, фолбек на querystring) у Rae вже ідентична Punkt. Не чіпати.

### 5.8. Ручна перевірка

Згенерувати підпис локально й відправити підроблений callback:

```bash
node -e 'import("crypto").then(({default:c})=>console.log(
  c.createHmac("md5","<WFP_TEST_SECRET_KEY>")
   .update(["acc","RAE_TEST_1","200.00","UAH","123456","41****1111","Approved","1100"].join(";"),"utf8")
   .digest("hex")))'

curl -s -X POST http://localhost:8888/.netlify/functions/wfp-callback \
  -H 'Content-Type: application/json' \
  -d '{"merchantAccount":"acc","orderReference":"RAE_TEST_1","amount":"200.00",
       "currency":"UAH","authCode":"123456","cardPan":"41****1111",
       "transactionStatus":"Approved","reasonCode":"1100","merchantSignature":"<підпис>"}'
```

Очікується ACK з `status: "accept"`. З навмисно зіпсованим підписом — той самий ACK,
але в логу `netlify dev` має бути `WFP callback signature mismatch`.

### 5.9. Коміт

`feat: wfp-callback.js — перевірка підпису, ACK, Brevo-лист, опційний Make-форвард`

**Готовність макро-пункту 5:** обидва сценарії з кроку 5.8 поводяться як описано.

---

# Макро-пункт 6. Фронтенд: підключення checkout і конфігурації товару

**Мета:** точкові правки в `public/app.js`. Логіка кошика, рендер і модалки не чіпаються.

### 6.1. `composeProductName(item)` — головна відмінність Rae від Punkt

Нова чиста функція поряд з іншими WFP-хелперами (біля `toMoney`):

```js
function composeProductName(item) {
  const size = item.height && item.radius ? `${item.height}x${item.radius} CM` : "";
  const parts = [item.name, item.material, item.color, size].filter(Boolean);
  return parts.join(", ");
}
```

Результат: `"Aria, Oak, Black, 45x60 CM"`. Порожні поля пропускаються — `height`, `radius`
і `material` у Rae вже нормалізуються до `""` в `addToCart`.

Обмеження, які треба врахувати:
- WFP має ліміт довжини назви товару. Якщо рядок виходить довшим за ~255 символів —
  обрізати. Для столиків це малоймовірно, але захист додати варто.
- Рядок іде в підпис HMAC, тому він має бути **байт-у-байт однаковий** на фронті й у тому,
  що піде в WFP. Жодних додаткових трансформацій на беку.

### 6.2. Підключити до `mapCartToWfpArrays`

Замінити `productName.push(item.name)` на `productName.push(composeProductName(item))`.
Порядок трьох масивів має лишитись однаковим — це критично для підпису.

### 6.3. `CHECKOUT_ENDPOINT`

Зараз `const CHECKOUT_ENDPOINT = ""` — checkout не працює взагалі.

Оскільки Parcel прибирається, підстановки на етапі збірки немає. Прописати константою
з можливістю локального перевизначення для тестового харнесу:

```js
const CHECKOUT_ENDPOINT =
  window.RAE_CHECKOUT_ENDPOINT || "https://<rae-site>.netlify.app/.netlify/functions/checkout";
```

`window.RAE_CHECKOUT_ENDPOINT` виставляється лише в `test/local-preview.html` і дає
підставляти tunnel-URL без правки `app.js` на кожен тест (крок 8.3).

Реальну назву сайту взяти з кроку 2.6. Прибрати закоментований приклад з `saule-backend`.

### 6.4. Прибрати спадщину Saule

- `makeOrderReference("SAULE")` → `makeOrderReference("RAE")`; дефолтний префікс у самій
  функції теж змінити на `"RAE"`.
- Закоментований редірект на `https://www.saule-objects.com/cart` у обробнику
  `.js-add-to-cart` — видалити або замінити на `CART_PAGE_URL` з реальним доменом Rae.
- Закоментовані `returnUrl` / `serviceUrl` у `buildWfpPayload` — видалити: тепер їх
  підставляє бекенд (крок 4.5), клієнт їх не шле.
- Закоментовані `WFP_MERCHANT_ACCOUNT` / `WFP_MERCHANT_DOMAIN` угорі файлу — видалити,
  щоб не було спокуси їх заповнити на фронті.

### 6.5. Стан кнопки під час запиту

Порт `setCheckoutButtonLoading` з `Punkt/src/frontend/cart.js` (рядки 240-249), з поправкою:

**У Punkt хук — `.checkout_button`, у Rae — `.checkout-button`, і це майже напевно `<a>`
або `<div>` з Webflow, а не `<button>`.** Властивість `disabled` на таких елементах
не працює. Використати:

```js
function setCheckoutButtonLoading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Обробка...";
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("is-loading");
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.removeAttribute("aria-disabled");
    btn.classList.remove("is-loading");
  }
}
```

а в обробнику кліку перевіряти
`if (!btn || btn.getAttribute("aria-disabled") === "true") return;`.
Це і є захист від подвійного сабміту.

Перевірити в Webflow, який саме тег у `.checkout-button`; якщо це `<button>` — додатково
ставити `btn.disabled`.

### 6.6. Ретрай мережевого запиту

Порт `fetchWithRetry` з `Punkt/src/frontend/utils/fetch-with-retry.js` **інлайном**
у `public/app.js` (модулів немає). Логіка: до 2 повторів, `baseDelayMs = 800`,
експоненційна затримка `800 → 1600`. Відповіді 4xx **не ретраяться** — це помилки запиту.

Переписати `submitOrder` на `async/await` за зразком Punkt (рядки 251-293), зі скиданням
стану кнопки в обох гілках помилки.

### 6.7. Валюта — вирішити тут

Rae шле `WFP_CURRENCY = "USD"`, Punkt — `"UAH"`. При цьому `deliveryList` у Rae —
`"nova;nova_pl;other"` (Нова пошта), що вказує на український контур, а ціни в кошику
рендеряться без символа валюти.

Дія: перевірити, у якій валюті працює тестовий мерчант WayForPay (див. крок 8.1).
Якщо UAH-only — змінити константу на `"UAH"` і звузити `ALLOWED_CURRENCIES` у
`validate-wfp.js` до фактично підтримуваних. Якщо потрібен саме USD — переконатись,
що він увімкнений у кабінеті мерчанта, інакше sandbox-оплата не пройде.

Це рішення блокує наскрізний тест, тож не відкладати.

### 6.8. Коміт

`feat: підключено checkout у app.js, конфігурації товару вшито в productName`

**Готовність макро-пункту 6:** у харнесі клік по `.checkout-button` веде на сторінку
WayForPay, де назви товарів містять матеріал, колір і розміри.

---

# Макро-пункт 7. Тести й локальний харнес

### 7.1. `netlify/functions/utils/validate-wfp.test.js`

Кейси:
- валідний payload → `[]`;
- `amount: "0"` і `amount: "abc"` → помилка про додатнє число;
- невідома валюта → помилка зі списком дозволених;
- `productPrice: ["-5"]` → помилка по індексу;
- `productCount: ["1.5"]` і `["0"]` → помилка про ціле додатнє;
- розходження суми (`amount: "999"` при `100 × 2`) → саме
  `"amount does not match sum(productPrice × productCount)"`;
- гранична точність: `amount` відрізняється на `0.005` → помилки немає (поріг `0.01`);
- порожні масиви товарів → перевірити, яку саме поведінку дає поточна реалізація,
  і зафіксувати її тестом.

### 7.2. `netlify/functions/utils/wfp-signature.test.js`

- `buildPurchaseBaseString` — порядок частин, і окремо перевірити, що **counts йдуть
  перед prices**. Це найлегша помилка в усьому проєкті, і вона проявляється лише як
  відмова WFP без пояснення.
- `hmacMd5Hex` — фіксований вектор: відомий рядок + відомий секрет → відомий hex.
  Порахувати один раз через `crypto` і захардкодити очікуване значення.
- `buildCallbackBaseString` — вісім полів у правильному порядку, `undefined` → `""`.
- `buildAckBaseString` — `orderReference;accept;<time>`.
- `resolveWfpSecret` — передати фейковий `env` об'єкт: `WFP_TEST_MODE: "true"` дає тестовий
  ключ, `"false"` і відсутність змінної дають live-ключ.

### 7.3. `netlify/functions/utils/brevo.test.js`

- `formatProducts([])` → `""`;
- `formatProducts` з двома позиціями → `"A ×2 — 100, B ×1 — 50"`;
- `formatProducts` з назвою, що містить конфігурації, — переконатись, що коми в назві
  не ламають читабельність (це відомий компроміс рішення "вшити в productName",
  зафіксувати його тестом як очікувану поведінку);
- `formatOrderDate(0)` і `formatOrderDate(undefined)` → `""`;
- `formatOrderDate(1700000000)` → непорожній рядок у форматі `uk-UA`.

`sendTransactionalEmail` мережу не викликаємо — достатньо перевірити, що без
`BREVO_API_KEY` він кидає помилку.

### 7.4. `test/local-preview.html` — харнес

Зразок `Punkt/test/local-preview.html`, але з повним набором хуків Rae з `DOM_HOOKS.md`:

- заглушка `window.Webflow = { push: (fn) => fn() }` **перед** підключенням скрипта;
- `window.RAE_CHECKOUT_ENDPOINT = "http://localhost:8888/.netlify/functions/checkout"`;
- два-три `.product` усередині `[data-item="product-wrapper"]` з усіма `data-*`
  (`data-name`, `data-price`, `data-img-src`, `data-product-page`, `data-product-height`,
  `data-product-radius`);
- радіо-інпути `input[name="product-material"]` з `data-material` і
  `input[name="product-color"]` з `data-color` + `data-color-sample` — щоб перевірити, що
  вибір конфігурації реально прописується в `data-product-material` / `data-product-color`;
- `.js-add-to-cart` у кожній картці;
- `#cart-container`, `.cart-bottom`, `.checkout-cost`, `.checkout-button`;
- `.cart-total-quantity` та `#cart-global-el` для лічильника;
- `<dialog id="cart-global-main">` і `<dialog id="cart-product-main">` з кнопками
  `[data-cart-global-button="close"]` / `[data-cart-product-button="close"]`
  та тогл-кнопками `#cart-global-toggle-btn` / `#cart-product-toggle-btn`;
- підключення `<script src="../public/app.js"></script>` (не `dist/` — збірки немає).

### 7.5. Коміт

`test: додано юніт-тести бекенд-утиліт і локальний харнес`

**Готовність макро-пункту 7:** `npm test` зелений; харнес відкривається у браузері,
кошик у ньому працює, вибір кольору й матеріалу відображається в позиції кошика.

---

# Макро-пункт 8. Наскрізний тестовий checkout-флоу

### 8.1. Заповнити `.env`

Локальний `.env` (у `.gitignore`, не комітити):
`WFP_TEST_MODE=true`, `WFP_TEST_SECRET_KEY`, тестовий `WFP_MERCHANT_ACCOUNT`,
`WFP_MERCHANT_DOMAIN`. Тут же підтвердити валюту тестового мерчанта (крок 6.7).

Якщо тестових креденшелів немає — зупинитись і запитати їх, не вигадувати.

### 8.2. Запустити тунель

`npm run dev` → у виводі знайти публічний URL виду
`https://<random>--<site>.netlify.live`. Він потрібен, бо WayForPay має достукатись до
callback ззовні; `localhost` для цього не годиться.

### 8.3. Підставити URL

- `WFP_SERVICE_URL` у `.env` = `<tunnel>/.netlify/functions/wfp-callback`;
- `window.RAE_CHECKOUT_ENDPOINT` у харнесі = `<tunnel>/.netlify/functions/checkout`
  (або `http://localhost:8888/...`, якщо checkout тестується без тунелю);
- перезапустити `netlify dev` після зміни `.env`.

### 8.4. Пройти флоу через Playwright MCP

1. Відкрити `test/local-preview.html`.
2. Обрати матеріал і колір у радіо-інпутах, перевірити в консолі, що атрибути
   `data-product-material` / `data-product-color` прописались у `.product`.
3. Додати товар, збільшити кількість до 2.
4. Відкрити кошик, звірити суму в `.checkout-cost`.
5. Натиснути `.checkout-button`, дочекатись редіректу на `secure.wayforpay.com`.
6. **На сторінці WFP перевірити, що назва товару містить матеріал, колір і розміри,
   а сума збігається з кошиком.** Це головна перевірка всього рішення "вшити в productName".

### 8.5. Тестова оплата й callback

Провести оплату sandbox-карткою WayForPay. Далі перевірити в логу `netlify dev`:
- вхідний POST на `wfp-callback`;
- `DEBUG_WFP_CALLBACK=1` показує розібране тіло;
- **немає** попередження `WFP callback signature mismatch`;
- повернутий ACK зі `status: "accept"`.

Якщо підпис не сходиться — першими підозрюваними є розсинхрон `WFP_TEST_MODE` між
функціями (крок 4.1) і порядок counts/prices у базовому рядку (крок 7.2).

### 8.6. Негативні перевірки

- checkout з `amount`, що не збігається з сумою → 400 з `details`;
- checkout без `provider` → 400;
- `GET` на обидві функції → 405;
- `OPTIONS` на checkout → 200 з CORS-заголовками.

### 8.7. Коміт

`test: пройдено наскрізний тестовий checkout-флоу на sandbox WayForPay`
(якщо код не змінювався — коміт не потрібен, достатньо звіту).

**Готовність макро-пункту 8:** повний цикл проходить локально, лог callback показує
валідний підпис.

---

# Макро-пункт 9. Brevo для Rae

**Блокується зовнішніми даними.** Виконується після отримання доступів до Brevo-акаунту
клієнта Rae. Решта пунктів від нього не залежить — код уже готовий і просто не надсилає
лист, поки змінні порожні (помилка логується, ACK повертається).

### 9.1. Підключити Brevo MCP локально для Rae

Тим самим способом, що в Punkt:
`claude mcp add --transport http brevo https://mcp.brevo.com/v1/brevo/mcp --header "Authorization: Bearer <token>"`,
local scope. Токен береться в Brevo: Account → SMTP & API → API Keys, з увімкненою опцією MCP.

### 9.2. Створити темплейт "Order confirmation"

Merge-теги рівно ті, що формує `utils/brevo.js`, без жодного зайвого:
`orderNumber`, `orderDate`, `recipientName`, `phone`, `products`, `total`.

Свідомо **не** додавати `deliveryAddress` і блоки наявності/передзамовлення: WFP не повертає
адресу доставки в callback, а статус наявності товару ніде не відстежується в коді.
Це та сама помилка, яку вже проходили в Punkt.

`products` приходить готовим рядком, а не масивом — у темплейті це один текстовий блок,
не цикл.

### 9.3. Заповнити env

`BREVO_API_KEY`, `BREVO_ORDER_CONFIRMATION_TEMPLATE_ID` (числовий ID темплейту),
`BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` — локально в `.env`, у проді в Netlify UI.
Відправник має бути верифікований у Brevo, інакше API поверне помилку.

### 9.4. Перевірити

Повторити тестову оплату з кроку 8.5 з реальною поштою в полі клієнта. Перевірити:
лист прийшов, `products` містить конфігурації товару, `total` має валюту,
`orderDate` у форматі `uk-UA`.

### 9.5. Коміт

`chore: налаштовано Brevo-темплейт підтвердження замовлення для Rae`

---

# Макро-пункт 10. Підготовка до прода й фіксація TODO

### 10.1. Заповнити `PROD_CHECKLIST.md`

1. **Env у Netlify UI** для сайту Rae: реальні `WFP_MERCHANT_ACCOUNT`, `WFP_SECRET_KEY`,
   `WFP_MERCHANT_DOMAIN` клієнта; `WFP_TEST_MODE=false`; `WFP_SERVICE_URL` і `WFP_RETURN_URL`
   на прод-домен; `CORS_ALLOWED_ORIGIN` = реальний Webflow-домен Rae замість `*`;
   Brevo-змінні; `MAKE_WEBHOOK_URL` порожній, якщо не потрібен; `DEBUG_WFP_CALLBACK`
   прибрати або лишити порожнім.
2. **Перевірка коду**: `CHECKOUT_ENDPOINT` у `public/app.js` вказує на прод-функцію;
   `CART_PAGE_URL` заповнений; `window.RAE_CHECKOUT_ENDPOINT` не встановлюється ніде,
   крім харнесу.
3. **Передпублікаційні перевірки**: `npm test` зелений; реальна тестова оплата на
   мінімальну суму на проді; перевірити CORS з реального Webflow-домену після звуження
   `CORS_ALLOWED_ORIGIN`.
4. **Brevo**: темплейт створений, відправник верифікований, лист доходить.
5. **Підміна ціни — критичний відкритий пункт.** Описати явно: `validate-wfp.js` звіряє лише
   внутрішню узгодженість payload, і `amount`, і `productPrice` походять з того самого
   клієнтського джерела. Покупець може відредагувати `price` у localStorage перед checkout,
   і перевірка все одно пройде. Реальний захист потребує серверного джерела правди по цінах
   (хардкоджена мапа товар → ціна в функції або запит до Webflow CMS API). **Обов'язково
   закрити до запуску з реальними платежами.** У межах цієї задачі свідомо не реалізується.

### 10.2. Зафіксувати TODO у `CLAUDE.md`

- захист від підміни ціни (посилання на розділ 5 чекліста);
- точний домен Webflow-сайту Rae для `WFP_MERCHANT_DOMAIN` і `CORS_ALLOWED_ORIGIN`;
- `CART_PAGE_URL` у `public/app.js`;
- підсумкове рішення по валюті;
- Brevo-змінні, якщо на момент завершення вони ще не отримані.

### 10.3. Коміт і пуш

`docs: заповнено PROD_CHECKLIST та зафіксовано відкриті TODO`

Після цього — **запитати підтвердження перед `git push`** і не пушити в `main` напряму.

---

# Порядок виконання й залежності

```
1 ──┐
2 ──┼──> 3 ──> 4 ──> 6 ──┐
    │         └──> 5 ──┤
    └──> 7 ────────────┴──> 8 ──> 10
                            9 ──────┘  (паралельно, блокується даними клієнта)
```

- Пункти 1 і 2 незалежні, робити першими.
- Пункт 3 — передумова для 4 і 5.
- Пункт 6 залежить від 4 (потрібен URL функції).
- Пункт 7 можна вести паралельно з 3-6.
- Пункт 8 потребує 4, 5, 6, 7 і тестових креденшелів WFP.
- Пункт 9 блокується доступами до Brevo клієнта, виконується коли завгодно після 5.
- Пункт 10 — фінальний.

# Верифікація готового результату

1. `npm test` — усі юніт-тести бекенд-утиліт зелені.
2. `npm run dev` піднімає `netlify dev --live`; у логу видно `checkout` і `wfp-callback`.
3. `curl` на checkout з валідним payload → `mode: "offline"` і `payUrl`.
4. `curl` з розбіжним `amount` → 400 з масивом `details`.
5. Харнес через Playwright MCP: вибір кольору й матеріалу → додавання → рендер кошика →
   checkout → сторінка WayForPay з назвами, що містять конфігурації, і правильною сумою.
6. Тестова оплата sandbox-карткою → лог показує вхідний callback з валідним підписом
   і повернутий ACK.
7. Після пункту 9 — лист від Brevo з коректними `products`, `total`, `orderDate`.
