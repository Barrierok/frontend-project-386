import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Page from "@/app/page";

describe("Smoke: приложение запускается", () => {
  afterEach(cleanup);

  it("главная страница рендерится без ошибок", () => {
    expect(() => render(<Page />)).not.toThrow();
  });

  it("на главной странице отображается заголовок", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Hello World");
  });
});
