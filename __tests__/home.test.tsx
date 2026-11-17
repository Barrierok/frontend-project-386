import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Page from "@/app/page";

describe("Главная страница", () => {
  afterEach(cleanup);

  it("показывает название сервиса", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CALENDAR");
  });

  it("ведёт на страницу записи", () => {
    render(<Page />);

    const links = screen.getAllByRole("link", { name: /Записаться/i });

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/booking");
    }
  });

  it("рассказывает о возможностях сервиса", () => {
    render(<Page />);

    const region = screen.getByRole("region", { name: "Возможности" });

    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
  });

  it("объясняет, как записаться", () => {
    render(<Page />);

    const region = screen.getByRole("region", { name: "Как это работает" });

    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
  });

  it("предлагает записаться в конце страницы", () => {
    render(<Page />);

    const region = screen.getByRole("region", { name: "Готовы записаться?" });

    expect(within(region).getByRole("link", { name: "Записаться" })).toHaveAttribute(
      "href",
      "/booking",
    );
  });
});
