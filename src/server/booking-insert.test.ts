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
});
