import { describe, expect, it } from "vitest";
import { validateWfpPayload } from "./validate-wfp.js";

// Базовий валідний payload: 100.00 × 2 = 200.00
const validPayload = () => ({
  amount: "200.00",
  currency: "UAH",
  productName: ["Aria, Oak, Black, 45x60 CM"],
  productPrice: ["100.00"],
  productCount: ["2"],
});

describe("validateWfpPayload", () => {
  it("не знаходить помилок у коректному payload", () => {
    expect(validateWfpPayload(validPayload())).toEqual([]);
  });

  it("відхиляє нульовий і нечисловий amount", () => {
    expect(validateWfpPayload({ ...validPayload(), amount: "0" }))
      .toContain("amount must be a positive number");
    expect(validateWfpPayload({ ...validPayload(), amount: "abc" }))
      .toContain("amount must be a positive number");
  });

  it("відхиляє невідому валюту й перелічує дозволені", () => {
    expect(validateWfpPayload({ ...validPayload(), currency: "PLN" }))
      .toContain("currency must be one of: UAH, USD, EUR");
  });

  it("відхиляє відʼємну ціну із зазначенням індексу", () => {
    const errors = validateWfpPayload({ ...validPayload(), amount: "10", productPrice: ["-5"], productCount: ["1"] });
    expect(errors).toContain("productPrice[0] must be a positive number");
  });

  it("вимагає, щоб кількість була цілим додатним числом", () => {
    expect(validateWfpPayload({ ...validPayload(), productCount: ["1.5"] }))
      .toContain("productCount[0] must be a positive integer");
    expect(validateWfpPayload({ ...validPayload(), productCount: ["0"] }))
      .toContain("productCount[0] must be a positive integer");
  });

  it("ловить розходження amount із сумою позицій", () => {
    expect(validateWfpPayload({ ...validPayload(), amount: "999" }))
      .toEqual(["amount does not match sum(productPrice × productCount)"]);
  });

  it("пропускає розбіжність у межах порогу 0.01", () => {
    // 200.005 vs 200.00 — різниця 0.005, менша за поріг
    expect(validateWfpPayload({ ...validPayload(), amount: "200.005" })).toEqual([]);
  });

  it("порожні масиви товарів дають розходження суми (pricesSum = 0)", () => {
    // Зафіксовано як поточна поведінка: окремої помилки "кошик порожній" немає,
    // порожній кошик відсікається розбіжністю amount із нульовою сумою позицій.
    expect(validateWfpPayload({ amount: "100", currency: "UAH", productPrice: [], productCount: [] }))
      .toEqual(["amount does not match sum(productPrice × productCount)"]);
  });
});
