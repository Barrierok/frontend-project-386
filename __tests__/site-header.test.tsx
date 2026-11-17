import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/booking" }));

import { SiteHeader } from "@/components/site-header";

describe("Шапка", () => {
  afterEach(cleanup);

  it("ведёт на страницы записи и админки", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute("href", "/booking");
    expect(screen.getByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
  });

  it("отмечает текущий раздел", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Админка" })).not.toHaveAttribute("aria-current");
  });

  it("ведёт на главную по логотипу", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/");
  });
});
