import { describe, it, expect } from "vitest";
import { resolveJwtSecret, resolveFrontendUrl, JWT_SECRET_DEV_DEFAULT } from "./config.js";

describe("resolveJwtSecret", () => {
  it("en desarrollo usa el fallback si falta JWT_SECRET", () => {
    expect(resolveJwtSecret({ NODE_ENV: "development" })).toBe(JWT_SECRET_DEV_DEFAULT);
  });

  it("en test usa el fallback si falta JWT_SECRET", () => {
    expect(resolveJwtSecret({ NODE_ENV: "test" })).toBe(JWT_SECRET_DEV_DEFAULT);
  });

  it("en desarrollo respeta JWT_SECRET si está definido", () => {
    expect(resolveJwtSecret({ NODE_ENV: "development", JWT_SECRET: "corto" })).toBe("corto");
  });

  it("en producción falla si falta JWT_SECRET", () => {
    expect(() => resolveJwtSecret({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
  });

  it("en producción falla si JWT_SECRET es el valor por defecto", () => {
    expect(() =>
      resolveJwtSecret({ NODE_ENV: "production", JWT_SECRET: JWT_SECRET_DEV_DEFAULT })
    ).toThrow(/JWT_SECRET/);
  });

  it("en producción falla si JWT_SECRET tiene menos de 32 caracteres", () => {
    expect(() =>
      resolveJwtSecret({ NODE_ENV: "production", JWT_SECRET: "a".repeat(31) })
    ).toThrow(/32/);
  });

  it("en producción acepta un secreto de 32 caracteres o más", () => {
    const secreto = "a".repeat(32);
    expect(resolveJwtSecret({ NODE_ENV: "production", JWT_SECRET: secreto })).toBe(secreto);
  });
});

describe("resolveFrontendUrl", () => {
  it("en desarrollo usa localhost si falta FRONTEND_URL", () => {
    expect(resolveFrontendUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
  });

  it("en producción falla si falta FRONTEND_URL", () => {
    expect(() => resolveFrontendUrl({ NODE_ENV: "production" })).toThrow(/FRONTEND_URL/);
  });

  it("en producción devuelve FRONTEND_URL si está definido", () => {
    expect(
      resolveFrontendUrl({ NODE_ENV: "production", FRONTEND_URL: "https://app.example.org" })
    ).toBe("https://app.example.org");
  });
});
