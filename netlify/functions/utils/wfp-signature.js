// netlify/functions/utils/wfp-signature.js
// Базові рядки підпису WayForPay + HMAC-MD5 + перемикач live/test-секрету.
//
// Винесено в чисті функції, щоб checkout.js і wfp-callback.js рахували підпис
// однією й тією ж логікою і щоб її можна було покрити юніт-тестами.

import crypto from "crypto";

// Безпечний String: null/undefined -> ""
const s = (v) => (v == null ? "" : String(v));

// Рядок підпису Purchase-запиту. Порядок полів заданий докою WFP і не обговорюється:
// merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;
//   <усі productName>;<усі productCount>;<усі productPrice>
//
// УВАГА: спочатку counts, потім prices. Переплутати їх легко, а WFP у відповідь
// просто відмовляє без пояснення причини.
//
// serviceUrl і returnUrl у підпис НЕ входять.
export function buildPurchaseBaseString({
  merchantAccount,
  merchantDomainName,
  orderReference,
  orderDate,
  amount,
  currency,
  productName = [],
  productCount = [],
  productPrice = [],
}) {
  return [
    s(merchantAccount),
    s(merchantDomainName),
    s(orderReference),
    s(orderDate),
    s(amount),
    s(currency),
    ...productName.map(s),
    ...productCount.map(s),
    ...productPrice.map(s),
  ].join(";");
}

// Рядок підпису вхідного serviceUrl-колбеку:
// merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
export function buildCallbackBaseString(data = {}) {
  return [
    s(data.merchantAccount),
    s(data.orderReference),
    s(data.amount),
    s(data.currency),
    s(data.authCode),
    s(data.cardPan),
    s(data.transactionStatus),
    s(data.reasonCode),
  ].join(";");
}

// Рядок підпису ACK-відповіді, яку ми повертаємо WFP: orderReference;status;time
export function buildAckBaseString(orderReference, status, time) {
  return [s(orderReference), s(status), s(time)].join(";");
}

export function hmacMd5Hex(message, secret) {
  return crypto.createHmac("md5", secret).update(message, "utf8").digest("hex");
}

// Єдине джерело правди про перемикач режиму: обидві функції (checkout і callback)
// мають брати секрет саме звідси, інакше підписи розійдуться.
export function resolveWfpSecret(env = process.env) {
  return env.WFP_TEST_MODE === "true" ? env.WFP_TEST_SECRET_KEY : env.WFP_SECRET_KEY;
}
