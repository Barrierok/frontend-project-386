import { describe, expect, it } from "vitest";

import { hasPgCode } from "./booking-insert";

describe("hasPgCode", () => {
  it("распознаёт код ошибки Postgres", () => {
    expect(hasPgCode({ code: "23P01" }, "23P01")).toBe(true);
    expect(hasPgCode({ code: "23P01" }, "40P01")).toBe(false);
  });

  it("не падает на не-объектах и объектах без строкового кода", () => {
    expect(hasPgCode(null, "23P01")).toBe(false);
    expect(hasPgCode("23P01", "23P01")).toBe(false);
    expect(hasPgCode({ code: 23 }, "23")).toBe(false);
    expect(hasPgCode({}, "23P01")).toBe(false);
  });

  it("находит код в cause, куда Drizzle кладёт ошибку драйвера", () => {
    const error = new Error("Failed query", { cause: { code: "57014" } });

    expect(hasPgCode(error, "57014")).toBe(true);
    expect(hasPgCode(error, "23P01")).toBe(false);
  });

  it("проходит несколько уровней cause и не зацикливается", () => {
    const cause = { code: "40P01" };
    const middle = { cause };
    const error = { cause: middle };

    expect(hasPgCode(error, "40P01")).toBe(true);

    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;

    expect(hasPgCode(cyclic, "40P01")).toBe(false);
  });
});
