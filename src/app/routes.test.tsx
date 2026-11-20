import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AdminPage from "@/app/admin/page";
import BookingPage from "@/app/booking/page";

describe("Страницы разделов", () => {
  afterEach(cleanup);

  it("страница записи показывает заголовок", () => {
    render(<BookingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Запись на звонок");
  });

  it("страница админки показывает заголовок и профиль владельца", () => {
    render(<AdminPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Админка");
  });
});
