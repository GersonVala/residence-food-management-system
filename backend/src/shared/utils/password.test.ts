import { describe, it, expect } from "vitest";
import { generarPasswordTemporal } from "./password.js";

describe("generarPasswordTemporal", () => {
  it("genera 10 caracteres por defecto", () => {
    expect(generarPasswordTemporal()).toHaveLength(10);
  });

  it("respeta el largo pedido", () => {
    expect(generarPasswordTemporal(16)).toHaveLength(16);
  });

  it("no usa caracteres ambiguos (0 O o l 1 I)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generarPasswordTemporal()).toMatch(/^[^0Ool1I]+$/);
    }
  });

  it("solo usa caracteres alfanuméricos", () => {
    for (let i = 0; i < 200; i++) {
      expect(generarPasswordTemporal()).toMatch(/^[A-Za-z0-9]+$/);
    }
  });

  it("genera valores distintos entre llamadas", () => {
    const valores = new Set(Array.from({ length: 50 }, () => generarPasswordTemporal()));
    expect(valores.size).toBe(50);
  });
});
