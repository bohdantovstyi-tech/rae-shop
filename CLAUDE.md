# Rae Shop — Cart & Checkout

## Опис проєкту

Кастомний JS-код кошика та checkout-логіки для сайту **Rae** (столики) на **Webflow**.
Скрипт підключається у Webflow через custom code (`<script src="...">`) і не є SPA/React —
це незалежний проєкт від глобального JS-стеку.

Функціонал:
- Кошик у `localStorage` (TTL 3 дні): додавання, +/-, видалення, рендер, дві модалки
- Ініціація оплати через **WayForPay** (Purchase, offline-режим з підписом на бекенді)
- Підтвердження замовлення через **Brevo Transactional Email API** (бекенд,
  `netlify/functions/utils/brevo.js`, викликається з `wfp-callback.js`)

**Ключова відмінність від споріднених проєктів (Punkt):** товар у Rae має конфігурації —
колір (`color` + `colorSample`), матеріал (`material`), висота (`height`) і радіус (`radius`).
Вони вибираються радіо-інпутами на сторінці товару, зберігаються в позиції кошика і
**вшиваються одним рядком у `productName`** перед відправкою в WayForPay
(див. `composeProductName` у `public/app.js`).

## Стек і залежності

- **Хостинг/деплой**: GitHub (`bohdantovstyi-tech/rae-shop`) → Netlify, сайт **rae-shop**
  (`https://rae-shop.netlify.app`, admin: `https://app.netlify.com/projects/rae-shop`),
  підключений через `netlify link`; авто-деплой при push у `main`
- **Бекенд**: Netlify Functions (Node.js)
- **Платежі**: WayForPay API (HMAC-підпис рахується лише на бекенді)
- **Email**: Brevo Transactional Email API (`api-key` + `templateId`, звичайний `fetch`
  без SDK) — окремий Brevo-акаунт клієнта Rae, не спільний з іншими проєктами
- **Мова**: vanilla JavaScript, без фреймворків і без TypeScript
- **Локальна розробка**: `netlify-cli` (devDependency) для `netlify dev --live`
- **Юніт-тести**: `vitest` (devDependency), `npm test`

> **Збірки немає.** У проєкті немає Parcel/Webpack/Vite. Директорія `public/` публікується
> Netlify **як є** (`publish = "public"` у `netlify.toml`), тож `public/app.js` — це той самий
> файл, який завантажує браузер. Наслідок: у `public/app.js` **не можна** використовувати
> `import`/`export` і `process.env` — усе має бути самодостатнім скриптом в одному
> `Webflow.push(...)`.

> Примітка: глобальні правила користувача (React 18, Radix UI тощо) стосуються інших
> проєктів. Тут стек навмисно інший — vanilla JS, бо код вбудовується в Webflow як
> зовнішній `<script>`.

## Структура репозиторію

```
rae-shop-codebase/
├── CLAUDE.md                 # цей файл
├── MACRO_PLAN.md             # план перенесення архітектури Punkt у Rae
├── PROD_CHECKLIST.md         # чекліст перед продом
├── DOM_HOOKS.md              # контракт селекторів із Webflow
├── .env.example              # перелік env-змінних (без значень)
├── netlify.toml              # publish/functions конфіг Netlify
├── package.json
├── scripts/
│   └── dev.sh                # netlify dev --live
├── public/                   # публікується Netlify як є
│   ├── app.js                # уся логіка кошика та checkout
│   ├── app.css
│   └── index.html
├── netlify/
│   └── functions/
│       ├── checkout.js       # Purchase: HMAC-підпис, offline-запит з fallback на form POST
│       ├── wfp-callback.js   # serviceUrl webhook: перевірка підпису, ACK, Brevo-лист
│       └── utils/
│           ├── validate-wfp.js       # валідація payload перед підписом
│           ├── wfp-signature.js      # базові рядки WFP + HMAC
│           ├── wfp-config.js         # мерчант/секрет/режим + sandbox-дефолти
│           ├── brevo.js              # Brevo Transactional Email API клієнт
│           ├── validate-wfp.test.js
│           ├── wfp-signature.test.js
│           ├── wfp-config.test.js
│           └── brevo.test.js
└── test/
    └── local-preview.html    # HTML-харнес для локального тестування без Webflow
```

## Frontend-конвенції

- Уся логіка кошика та checkout — в одному файлі `public/app.js`, усередині
  `window.Webflow.push(() => { ... })`
- Файл віддається Netlify як статика й підключається у Webflow custom code:
  `<script src="https://rae-shop.netlify.app/app.js"></script>`
- Script-теги не підпадають під CORS — підвантаження скрипта з іншого домену не проблема
- Ніяких `import`/`export` у `public/app.js` — збірки немає, браузер отримує файл як є
- Селектори, які скрипт очікує знайти в розмітці Webflow, задокументовані в
  [`DOM_HOOKS.md`](./DOM_HOOKS.md). Це контракт: зміна класу в Webflow ламає скрипт мовчки
- `CHECKOUT_ENDPOINT` — константа в коді з можливістю локального перевизначення через
  `window.RAE_CHECKOUT_ENDPOINT` (виставляється лише в `test/local-preview.html`)

## Backend-конвенції (netlify/functions)

- Кожна функція — окремий файл у `netlify/functions/`; спільна логіка — в `utils/`
- HMAC-підпис WayForPay рахується **лише на бекенді**, ніколи у фронтенд-коді
- **CORS**: на відміну від `<script src>`, виклик `fetch(CHECKOUT_ENDPOINT)` з `app.js`
  до Netlify Function — це cross-origin XHR (домен Webflow ≠ домен Netlify). Кожна функція
  повертає `Access-Control-Allow-Origin` з `CORS_ALLOWED_ORIGIN` (порожньо = `*`)
- `netlify/functions/` **комітиться в git** (на відміну від `.netlify/`) — саме так
  GitHub → Netlify інтеграція деплоїть функції при push
- Мерчант, секрет і режим live/test — лише через `utils/wfp-config.js`. Обидві функції
  (`checkout.js` і `wfp-callback.js`) беруть їх звідти; якщо вони розійдуться за режимом
  чи секретом — підпис на checkout і перевірка на callback не зійдуться
- Креденшли пісочниці WFP (`test_merch_n1` / `www.market.ua` / тестовий ключ) **зашиті
  в `wfp-config.js` і закомічені навмисно** — це публічні значення з доки WFP. Завдяки
  їм тестове середовище працює без жодної env-змінної. Реальні клієнтські токени
  (WFP live + Brevo) задаються **тільки** в Netlify UI і перебивають дефолти.
  Режим визначається так: `WFP_TEST_MODE=true` → пісочниця, `=false` → live,
  змінної немає → live за наявності `WFP_SECRET_KEY`, інакше пісочниця
- `serviceUrl` і `returnUrl` підставляє **бекенд** з env (`WFP_SERVICE_URL`, `WFP_RETURN_URL`),
  а не клієнт: env має пріоритет, щоб клієнт не міг перенаправити callback на свій сервер.
  Ці поля **не входять** у рядок підпису WFP Purchase
- `wfp-callback.js` опційно форвардить нормалізований payload у зовнішню автоматизацію
  (напр. Make.com) — вимкнено за замовчуванням, активується лише якщо задано `MAKE_WEBHOOK_URL`
- Відправка email через Brevo після успішної оплати (`success && isSignatureValid`);
  помилка Brevo логується (`console.error`), але **не блокує** ACK-відповідь WFP.
  Дані про адресу доставки в листі відсутні — WFP не повертає їх у callback

## Env-змінні

Перелік у [`.env.example`](./.env.example). Реальні значення:
- Локально — `.env` у корені (в `.gitignore`, ніколи не комітити)
- Прод — Netlify UI → Site settings → Environment variables (сайт `rae-shop`)

`CHECKOUT_ENDPOINT` як env-змінна тут **не потрібна** (на відміну від Punkt): збірки немає,
підставити значення в бандл нікому, тож URL бекенду — константа в `public/app.js`.

## Локальна розробка

Один термінал, одна команда:

```
npm run dev
```

Це запускає `scripts/dev.sh` → `netlify dev --live`: локальний сервер зі статикою `public/`,
функціями з `netlify/functions/` **і публічним тунелем**. У виводі шукати публічний URL виду
`https://<random>--rae-shop.netlify.live` — він потрібен для `WFP_SERVICE_URL`, бо WayForPay
має достукатись до callback ззовні, а `localhost` для цього не годиться.

Додатково: відкрити `test/local-preview.html` — харнес з тестовими товарами, радіо-інпутами
конфігурацій, кошиком і модалками та заглушкою `window.Webflow` (реальний Webflow сам
виконує чергу `Webflow.push(fn)`; тут її імітує `{ push: fn => fn() }`). Харнес підключає
`../public/app.js` напряму — жодної збірки.

Юніт-тести бекенд-утиліт: `npm test` (vitest). Фронтенд юніт-тестами не покривається —
без бандлера `public/app.js` не імпортується в тест; для нього харнес + Playwright MCP.

## Деплой

Push у `main` на GitHub → Netlify деплоїть і статику (`public/`), і функції
(`netlify/functions/`). Ручний деплой не потрібен.

Збірки немає, але `command` у `netlify.toml` заданий явно (`echo ...`): у налаштуваннях
сайту в Netlify UI лишилась команда `npm run build`, а такого скрипта в `package.json`
немає, через що деплой падав. `netlify.toml` має пріоритет над UI, тож правити щось
у Netlify не треба — **не видаляти `command` з `netlify.toml`**.

Тестовий деплой без чіпання проду:
`netlify deploy --no-build --dir public --functions netlify/functions` — дає окремий
draft-URL. Зараз такі деплої закриті Netlify-авторизацією (`sso_login_context:
non_production`), тож із Webflow вони не підвантажаться, поки захист не вимкнути
в Site configuration → Access & security.

**Перед публікацією на прод з реальними клієнтськими токенами WFP** — пройтись за
чеклістом [`PROD_CHECKLIST.md`](./PROD_CHECKLIST.md).

## Конвенції коду/гіту

- Commit-повідомлення: `type: короткий опис` (`feat:`, `fix:`, `refactor:`, `chore:`)
- При коміті — сам аналізувати зміни й пропонувати повідомлення
- Завжди питати підтвердження перед `git push`; ніколи не пушити напряму в `main`
- Питати перед додаванням нових npm-пакетів
- Коментарі в коді — українською, назви змінних — англійські

## Відкриті питання / TODO

- [ ] **Захист від підміни ціни товару** — `validate-wfp.js` звіряє лише внутрішню
  узгодженість payload, серверного джерела правди по цінах немає. Деталі й варіант
  рішення — [`PROD_CHECKLIST.md`](./PROD_CHECKLIST.md), розділ 5.
  **Обов'язково закрити перед продом з реальними платежами**
- [ ] **Доступ до Netlify-сайту `rae-shop`** — залогінений акаунт `netlify-cli`
  (`hello@htotse.com`, команда «Hto tse?») цього сайту не бачить, хоча локальний
  `.netlify/state.json` на нього прив'язаний. Через це `netlify dev --live` не
  запускається (`Failed retrieving addons for site ...: Not Found`), тунелю немає, і
  наскрізний тест callback від WayForPay локально неможливий. Локально працює лише
  `netlify dev --offline`. Потрібен логін в акаунт-власник сайту
- [ ] **Точний домен Webflow-сайту Rae** для `WFP_MERCHANT_DOMAIN` і `CORS_ALLOWED_ORIGIN`
  (у порожньому кошику `public/app.js` посилається на `https://rae-otsedesign.webflow.io`,
  але як фінальний домен це не підтверджено)
- [ ] **`CART_PAGE_URL` у `public/app.js`** — зараз `""`, тож редірект на сторінку кошика
  після додавання товару вимкнений. Це свідоме рішення (у Rae кошик у модалках),
  переглянути, якщо поведінку захочуть змінити
- [ ] **Валюта** — `WFP_CURRENCY = "USD"` у `public/app.js`, `ALLOWED_CURRENCIES` у
  `validate-wfp.js` — усі три (`UAH`, `USD`, `EUR`). Sandbox приймає будь-яку з них на
  етапі створення платіжного URL, тож питання вирішує лише кабінет реального мерчанта.
  Після підтвердження — звузити `ALLOWED_CURRENCIES` до фактично увімкнених
- [ ] **Brevo-змінні** (`BREVO_API_KEY`, `BREVO_ORDER_CONFIRMATION_TEMPLATE_ID`,
  `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`) — ще не отримані. Поки їх немає, лист просто
  не надсилається: помилка логується, ACK для WFP усе одно повертається
- [ ] **Темплейт «Order confirmation» у Brevo** — створити з merge-тегами `orderNumber`,
  `orderDate`, `recipientName`, `phone`, `products`, `total`. Без `deliveryAddress` і без
  блоків наявності/передзамовлення. `products` приходить готовим рядком, не масивом
