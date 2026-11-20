import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/site-footer";

describe("Подвал", () => {
  afterEach(cleanup);

  it("показывает бренд и копирайт", () => {
    render(<SiteFooter />);

    expect(screen.getByText("© 2026 Calendar")).toBeInTheDocument();
  });

  it("ведёт на страницы записи и админки", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute("href", "/booking");
    expect(screen.getByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
  });
});
