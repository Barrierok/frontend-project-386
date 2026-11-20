import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyEventTypes } from "./empty-event-types";

describe("Пустое состояние типов событий", () => {
  afterEach(cleanup);

  it("объясняет, что типов ещё нет", () => {
    render(<EmptyEventTypes />);

    expect(screen.getByText("Пока нет типов событий")).toBeInTheDocument();
    expect(screen.getByText(/Владелец календаря ещё не добавил/)).toBeInTheDocument();
  });
});
