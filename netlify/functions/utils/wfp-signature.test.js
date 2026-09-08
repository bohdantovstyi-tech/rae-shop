import { describe, expect, it } from "vitest";
import {
  buildAckBaseString,
  buildCallbackBaseString,
  buildPurchaseBaseString,
  hmacMd5Hex,
  resolveWfpSecret,
} from "./wfp-signature.js";

describe("buildPurchaseBaseString", () => {
  const args = {
    merchantAccount: "test_merch_n1",
    merchantDomainName: "www.market.ua",
    orderReference: "RAE_1",
    orderDate: 1700000000,
    amount: "200.00",
    currency: "UAH",
    productName: ["Aria", "Nova"],
    productCount: ["2", "3"],
    productPrice: ["100.00", "50.00"],
  };

  it("склеює частини в порядку, який вимагає WFP", () => {
    expect(buildPurchaseBaseString(args)).toBe(
      "test_merch_n1;www.market.ua;RAE_1;1700000000;200.00;UAH;Aria;Nova;2;3;100.00;50.00"
    );
  });

  it("ставить counts ПЕРЕД prices — найлегша помилка в усьому проєкті", () => {
    const parts = buildPurchaseBaseString(args).split(";");
    // 6 скалярів + 2 назви = індекс 8 — початок counts
    expect(parts.slice(8, 10)).toEqual(["2", "3"]);
    expect(parts.slice(10, 12)).toEqual(["100.00", "50.00"]);
  });

  it("не падає на відсутніх масивах товарів", () => {
    expect(buildPurchaseBaseString({ merchantAccount: "a", merchantDomainName: "b" }))
      .toBe("a;b;;;;");
  });
});

describe("hmacMd5Hex", () => {
  it("дає фіксований відомий вектор", () => {
    expect(hmacMd5Hex("hello;world", "test-secret"))
      .toBe("ac1023f97a299b2098f8050a462b7195");
  });
});

describe("buildCallbackBaseString", () => {
  it("складає вісім полів у правильному порядку", () => {
    expect(
      buildCallbackBaseString({
        merchantAccount: "acc",
        orderReference: "RAE_1",
        amount: "200.00",
        currency: "UAH",
        authCode: "123456",
        cardPan: "41****1111",
        transactionStatus: "Approved",
        reasonCode: "1100",
      })
    ).toBe("acc;RAE_1;200.00;UAH;123456;41****1111;Approved;1100");
  });

  it("перетворює відсутні поля на порожні рядки", () => {
    expect(buildCallbackBaseString({ merchantAccount: "acc" })).toBe("acc;;;;;;;");
  });
});

describe("buildAckBaseString", () => {
  it("складає orderReference;status;time", () => {
    expect(buildAckBaseString("RAE_1", "accept", 1700000000))
      .toBe("RAE_1;accept;1700000000");
  });
});

describe("resolveWfpSecret", () => {
  const env = { WFP_SECRET_KEY: "live-key", WFP_TEST_SECRET_KEY: "test-key" };

  it("повертає тестовий ключ при WFP_TEST_MODE=true", () => {
    expect(resolveWfpSecret({ ...env, WFP_TEST_MODE: "true" })).toBe("test-key");
  });

  it("повертає live-ключ при WFP_TEST_MODE=false", () => {
    expect(resolveWfpSecret({ ...env, WFP_TEST_MODE: "false" })).toBe("live-key");
  });

  it("повертає live-ключ, коли змінної немає взагалі", () => {
    expect(resolveWfpSecret(env)).toBe("live-key");
  });
});
