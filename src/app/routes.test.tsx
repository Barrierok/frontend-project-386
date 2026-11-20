import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AdminPage from "@/app/admin/page";
import BookingPage from "@/app/booking/page";

describe("Заглушки разделов", () => {
  afterEach(cleanup);

  it("страница записи сообщает, что запись скоро появится", () => {
    render(<BookingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Запись на звонок");
  });

  it("страница админки сообщает, что раздел скоро появится", () => {
    render(<AdminPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Админка");
  });

  it("со страницы записи можно вернуться на главную", () => {
    render(<BookingPage />);

    expect(screen.getByRole("link", { name: /На главную/i })).toHaveAttribute("href", "/");
  });
});
