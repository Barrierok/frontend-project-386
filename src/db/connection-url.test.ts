import { describe, expect, it } from "vitest";

import { withLibpqSslCompat } from "./connection-url";

describe("withLibpqSslCompat", () => {
  it("добавляет uselibpqcompat для sslmode=require", () => {
    const result = withLibpqSslCompat(
      "postgresql://postgres:secret@pooler.example.com:5432/postgres?sslmode=require",
    );

    expect(result).toBe(
      "postgresql://postgres:secret@pooler.example.com:5432/postgres?sslmode=require&uselibpqcompat=true",
    );
  });

  it.each([
    [
      "sslmode=verify-full",
      "postgresql://postgres:secret@pooler.example.com:5432/postgres?sslmode=verify-full",
    ],
    ["строку без sslmode", "postgres://postgres:postgres@localhost:5433/calendar_test"],
    [
      "уже заданный uselibpqcompat",
      "postgresql://postgres:secret@pooler.example.com:5432/postgres?sslmode=require&uselibpqcompat=true",
    ],
    ["некорректную строку", "not a url"],
  ])("не трогает %s", (_label, url) => {
    expect(withLibpqSslCompat(url)).toBe(url);
  });
});
