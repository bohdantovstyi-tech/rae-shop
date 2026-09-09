import { describe, expect, it } from "vitest";
import {
  WFP_SANDBOX,
  isTestMode,
  resolveMerchant,
  resolveWfpConfig,
  resolveWfpSecret,
} from "./wfp-config.js";

describe("isTestMode", () => {
  it("вмикається явно через WFP_TEST_MODE=true", () => {
    expect(isTestMode({ WFP_TEST_MODE: "true", WFP_SECRET_KEY: "live-key" })).toBe(true);
  });

  it("вимикається явно через WFP_TEST_MODE=false навіть без live-ключа", () => {
    expect(isTestMode({ WFP_TEST_MODE: "false" })).toBe(false);
  });

  it("без прапорця йде в live, якщо заданий WFP_SECRET_KEY", () => {
    expect(isTestMode({ WFP_SECRET_KEY: "live-key" })).toBe(false);
  });

  it("без прапорця і без live-ключа падає в пісочницю", () => {
    expect(isTestMode({})).toBe(true);
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

  it("повертає live-ключ, коли прапорця немає, але live-ключ заданий", () => {
    expect(resolveWfpSecret(env)).toBe("live-key");
  });

  it("на порожньому env віддає sandbox-секрет із репозиторію", () => {
    expect(resolveWfpSecret({})).toBe(WFP_SANDBOX.secretKey);
  });
});

describe("resolveMerchant", () => {
  it("у live-режимі бере лише env, без дефолтів", () => {
    expect(resolveMerchant({ WFP_SECRET_KEY: "live-key" })).toEqual({
      merchantAccount: undefined,
      merchantDomain: undefined,
    });
  });

  it("у тестовому режимі підставляє sandbox-мерчанта", () => {
    expect(resolveMerchant({})).toEqual({
      merchantAccount: WFP_SANDBOX.merchantAccount,
      merchantDomain: WFP_SANDBOX.merchantDomain,
    });
  });

  it("env перебиває sandbox-дефолт і в тестовому режимі", () => {
    const env = { WFP_TEST_MODE: "true", WFP_MERCHANT_ACCOUNT: "my_sandbox" };
    expect(resolveMerchant(env).merchantAccount).toBe("my_sandbox");
    expect(resolveMerchant(env).merchantDomain).toBe(WFP_SANDBOX.merchantDomain);
  });
});

describe("resolveWfpConfig", () => {
  it("на порожньому env віддає повністю робочу sandbox-конфігурацію", () => {
    expect(resolveWfpConfig({})).toEqual({
      testMode: true,
      merchantAccount: WFP_SANDBOX.merchantAccount,
      merchantDomain: WFP_SANDBOX.merchantDomain,
      secretKey: WFP_SANDBOX.secretKey,
      usingSandboxDefaults: true,
    });
  });

  it("не піднімає прапорець sandbox-дефолтів, коли ключ заданий явно", () => {
    const cfg = resolveWfpConfig({ WFP_TEST_MODE: "true", WFP_TEST_SECRET_KEY: "test-key" });
    expect(cfg.usingSandboxDefaults).toBe(false);
    expect(cfg.secretKey).toBe("test-key");
  });

  it("у live-режимі віддає клієнтські значення з env", () => {
    expect(resolveWfpConfig({
      WFP_SECRET_KEY: "live-key",
      WFP_MERCHANT_ACCOUNT: "rae_prod",
      WFP_MERCHANT_DOMAIN: "rae.example",
    })).toEqual({
      testMode: false,
      merchantAccount: "rae_prod",
      merchantDomain: "rae.example",
      secretKey: "live-key",
      usingSandboxDefaults: false,
    });
  });
});
