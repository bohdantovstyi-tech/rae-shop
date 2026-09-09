// netlify/functions/utils/wfp-config.js
// Єдине джерело правди про те, з якими креденшлами WayForPay працює бекенд.
//
// Логіка одна для checkout.js і wfp-callback.js: якщо вони розійдуться в режимі
// або секреті — підпис на checkout і перевірка на callback не зійдуться.

// Публічні креденшли пісочниці WayForPay. Вони навмисно лежать у репозиторії:
// це загальнодоступні тестові значення з документації WFP, не клієнтські секрети.
// Завдяки їм тестове середовище (локальний netlify dev, draft-деплой) працює
// без жодного налаштування в Netlify.
//
// Реальні клієнтські значення задаються env-змінними в Netlify UI і завжди
// мають пріоритет — сюди їх не додавати.
export const WFP_SANDBOX = {
  merchantAccount: "test_merch_n1",
  merchantDomain: "www.market.ua",
  secretKey: "flk3409refn54t54t*FNJRET",
};

// Режим визначається так:
//   WFP_TEST_MODE="true"  -> пісочниця (явно)
//   WFP_TEST_MODE="false" -> live (явно)
//   змінної немає         -> live, якщо заданий WFP_SECRET_KEY, інакше пісочниця
// Останнє правило і робить тестове середовище робочим "з коробки": поки на сайті
// немає жодної env-змінної, ми не падаємо з "Missing env vars", а йдемо в sandbox.
export function isTestMode(env = process.env) {
  if (env.WFP_TEST_MODE === "true") return true;
  if (env.WFP_TEST_MODE === "false") return false;
  return !env.WFP_SECRET_KEY;
}

// Секрет для HMAC. У тестовому режимі env-змінна все одно має пріоритет над
// дефолтом — якщо хтось захоче свій sandbox-мерчант, достатньо задати змінну.
export function resolveWfpSecret(env = process.env) {
  if (!isTestMode(env)) return env.WFP_SECRET_KEY;
  return env.WFP_TEST_SECRET_KEY || WFP_SANDBOX.secretKey;
}

// merchantAccount + merchantDomainName. У live-режимі дефолтів немає навмисно:
// краще віддати зрозумілу помилку, ніж мовчки підписати реальний платіж
// тестовим мерчантом.
export function resolveMerchant(env = process.env) {
  if (!isTestMode(env)) {
    return {
      merchantAccount: env.WFP_MERCHANT_ACCOUNT,
      merchantDomain: env.WFP_MERCHANT_DOMAIN,
    };
  }
  return {
    merchantAccount: env.WFP_MERCHANT_ACCOUNT || WFP_SANDBOX.merchantAccount,
    merchantDomain: env.WFP_MERCHANT_DOMAIN || WFP_SANDBOX.merchantDomain,
  };
}

// Зведена конфігурація + прапорець, чи спрацював fallback на пісочницю
// (checkout.js логує це, щоб у продових логах було видно "ми не в live").
export function resolveWfpConfig(env = process.env) {
  const testMode = isTestMode(env);
  const { merchantAccount, merchantDomain } = resolveMerchant(env);
  return {
    testMode,
    merchantAccount,
    merchantDomain,
    secretKey: resolveWfpSecret(env),
    usingSandboxDefaults: testMode && !env.WFP_SECRET_KEY && !env.WFP_TEST_SECRET_KEY,
  };
}
