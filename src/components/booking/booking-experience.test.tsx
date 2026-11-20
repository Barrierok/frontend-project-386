import { ORPCError } from "@orpc/client";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Booking, DaySlots, EventType } from "@/contract/schemas";

import { BookingExperience } from "./booking-experience";

const availability = vi.hoisted(() => ({
  days: [] as DaySlots[],
  get: vi.fn<(input: { eventTypeId: string }) => Promise<{ days: DaySlots[] }>>(),
}));

const bookings = vi.hoisted(() => ({
  create: vi.fn<() => Promise<Booking>>(),
}));

vi.mock("@/lib/orpc-client", () => ({
  orpcClient: {
    availability: { get: availability.get },
    bookings: { create: bookings.create },
  },
}));

const navigation = vi.hoisted(() => ({
  refresh: vi.fn<() => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

const eventTypes: EventType[] = [
  {
    id: "call-15",
    title: "Звонок на 15 минут",
    description: "Короткий звонок.",
    durationMinutes: 15,
    createdAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "call-30",
    title: "Звонок на 30 минут",
    description: "",
    durationMinutes: 30,
    createdAt: "2026-11-19T11:00:00.000Z",
  },
];

function buildDays(slotCounts: number[]): DaySlots[] {
  const start = Date.UTC(2026, 10, 20);

  return slotCounts.map((count, index) => {
    const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);

    return {
      date,
      slots: Array.from({ length: count }, (_, slotIndex) => ({
        startsAt: `${date}T${String(6 + slotIndex).padStart(2, "0")}:00:00.000Z`,
      })),
    };
  });
}

describe("Форма записи", () => {
  beforeEach(() => {
    availability.days = buildDays([2, 0, 1, ...Array.from({ length: 11 }, () => 0)]);
    availability.get.mockReset();
    availability.get.mockResolvedValue({ days: availability.days });
    bookings.create.mockReset();
    navigation.refresh.mockReset();
  });

  afterEach(cleanup);

  it("выбирает первый тип события и показывает его панель", () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    expect(screen.getByLabelText("Тип события")).toBeInTheDocument();
    expect(screen.getByText("Звонок на 15 минут")).toBeInTheDocument();
    expect(screen.getByText("15 мин")).toBeInTheDocument();
    expect(screen.getByText("Короткий звонок.")).toBeInTheDocument();
  });

  it("не рендерит пустое описание", async () => {
    render(<BookingExperience eventTypes={[eventTypes[1]]} />);

    await waitFor(() => expect(availability.get).toHaveBeenCalled());

    expect(screen.queryByText("Короткий звонок.")).not.toBeInTheDocument();
  });

  it("показывает 14 дней, счётчики и первый доступный день", async () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    const calendar = await screen.findByRole("group", { name: "Дни окна записи" });
    const days = screen.getAllByRole("button", { name: /места|место|нет/ });

    expect(days).toHaveLength(14);
    expect(calendar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 места/ })).toHaveAttribute("aria-pressed", "true");
    for (const emptyDay of screen.getAllByRole("button", { name: /нет/ })) {
      expect(emptyDay).toBeDisabled();
    }
  });

  it("показывает баннер, если во всём окне нет слотов", async () => {
    availability.days = buildDays(Array.from({ length: 14 }, () => 0));
    availability.get.mockResolvedValue({ days: availability.days });

    render(<BookingExperience eventTypes={eventTypes} />);

    expect(await screen.findByText("Свободных слотов в ближайшие 14 дней нет")).toBeInTheDocument();
  });

  it("проводит гостя от слота до «билета»", async () => {
    bookings.create.mockResolvedValue({
      id: "booking-1",
      startsAt: "2026-11-20T06:00:00.000Z",
      endsAt: "2026-11-20T06:30:00.000Z",
      guestName: "Иван",
      guestEmail: "ivan@example.com",
      createdAt: "2026-11-19T21:10:00.000Z",
      eventType: { id: "call-15", title: "Звонок на 15 минут", durationMinutes: 15 },
    });

    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить запись" }));

    expect(await screen.findByText("Запись подтверждена")).toBeInTheDocument();
    expect(bookings.create).toHaveBeenCalledWith({
      eventTypeId: "call-15",
      startsAt: "2026-11-20T06:00:00.000Z",
      guestName: "Иван",
      guestEmail: "ivan@example.com",
    });
    expect(screen.getByRole("link", { name: /На главную/ })).toHaveAttribute("href", "/");
  });

  it("при 409 закрывает шторку, сохраняет контакты и перезапрашивает слоты", async () => {
    bookings.create.mockRejectedValue(
      new ORPCError("SLOT_TAKEN", {
        defined: true,
        status: 409,
        message: "Это время уже занято, выберите другой слот",
      }),
    );

    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить запись" }));

    expect(
      await screen.findByText("Это время уже занято, выберите другой слот"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(availability.get).toHaveBeenCalledTimes(2));

    fireEvent.click(await screen.findByRole("button", { name: "10:00" }));

    expect(await screen.findByLabelText("Имя")).toHaveValue("Иван");
    expect(screen.getByLabelText("Email")).toHaveValue("ivan@example.com");
  });

  it("показывает ошибки полей и не отправляет пустую форму", async () => {
    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.click(await screen.findByRole("button", { name: "Подтвердить запись" }));

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(screen.getByText("Введите корректный email")).toBeInTheDocument();
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it("при 503 оставляет шторку открытой и показывает текст контракта", async () => {
    bookings.create.mockRejectedValue(
      new ORPCError("SLOT_TIMEOUT", {
        defined: true,
        status: 503,
        message: "Сервис перегружен, попробуйте ещё раз",
      }),
    );

    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить запись" }));

    expect(await screen.findByText("Сервис перегружен, попробуйте ещё раз")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Имя")).toHaveValue("Иван");
  });

  it("на прочий сбой показывает общий текст и сохраняет контакты", async () => {
    bookings.create.mockRejectedValue(new Error("network"));

    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить запись" }));

    expect(
      await screen.findByText("Не удалось создать запись, попробуйте ещё раз"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("при исчезнувшем типе события закрывает шторку и обновляет страницу", async () => {
    bookings.create.mockRejectedValue(
      new ORPCError("EVENT_TYPE_NOT_FOUND", {
        defined: true,
        status: 404,
        message: "Тип события не найден",
      }),
    );

    render(<BookingExperience eventTypes={eventTypes} />);

    fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
    fireEvent.change(await screen.findByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить запись" }));

    expect(await screen.findByText("Тип события не найден")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
  });
});
