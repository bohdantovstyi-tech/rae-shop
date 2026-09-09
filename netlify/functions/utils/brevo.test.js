import { describe, expect, it } from "vitest";
import { formatOrderDate, formatProducts, sendTransactionalEmail } from "./brevo.js";

describe("formatProducts", () => {
  it("порожній список дає порожній рядок", () => {
    expect(formatProducts([])).toBe("");
  });

  it("склеює позиції через кому", () => {
    expect(
      formatProducts([
        { name: "A", count: 2, price: 100 },
        { name: "B", count: 1, price: 50 },
      ])
    ).toBe("A ×2 — 100, B ×1 — 50");
  });

  it("назва з конфігураціями лишається як є, разом із власними комами", () => {
    // Свідомий компроміс рішення "вшити конфігурації в productName": коми
    // всередині назви не відрізняються від коми-роздільника між позиціями.
    // Зафіксовано як очікувана поведінка, а не як дефект.
    expect(formatProducts([{ name: "Aria, Oak, Black, 45x60 CM", count: 1, price: "1200.00" }]))
      .toBe("Aria, Oak, Black, 45x60 CM ×1 — 1200.00");
  });
});

describe("formatOrderDate", () => {
  it("порожнє значення дає порожній рядок", () => {
    expect(formatOrderDate(0)).toBe("");
    expect(formatOrderDate(undefined)).toBe("");
  });

  it("unix-секунди форматуються в uk-UA", () => {
    const formatted = formatOrderDate(1700000000);
    expect(formatted).not.toBe("");
    // uk-UA дає ДД.ММ.РРРР
    expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe("sendTransactionalEmail", () => {
  it("кидає помилку без BREVO_API_KEY (мережу не чіпаємо)", async () => {
    const saved = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;
    await expect(
      sendTransactionalEmail({ to: { email: "a@b.c" }, templateId: 1, params: {} })
    ).rejects.toThrow("Missing BREVO_API_KEY env var");
    if (saved !== undefined) process.env.BREVO_API_KEY = saved;
  });
});
