import { expect, test } from "@playwright/test";

const eventTypeTitle = "Звонок на 30 минут";
const guest = {
  name: "Гость E2E",
  email: "guest-e2e@example.com",
};

test("гость занимает свободный слот, а владелец видит запись в админке", async ({ page }) => {
  await test.step("гость открывает календарь и выбирает тип события", async () => {
    await page.goto("/booking");

    await expect(page.getByRole("heading", { level: 1, name: "Запись на звонок" })).toBeVisible();

    const eventTypeSelect = page.getByRole("combobox", { name: "Тип события" });
    await eventTypeSelect.click();
    await page.getByRole("option", { name: eventTypeTitle }).click();

    await expect(eventTypeSelect).toContainText(eventTypeTitle);

    // Панель доступности перезагружается при смене типа события.
    await expect(page.getByLabel("Загрузка свободных дней")).toBeHidden();
    await expect(page.getByRole("group", { name: "Дни окна записи" })).toBeVisible();
  });

  const freeDay = page
    .getByRole("group", { name: "Дни окна записи" })
    .locator("button:enabled")
    .first();
  const freeSlot = page
    .getByRole("group", { name: "Свободные слоты" })
    .locator("button:enabled")
    .first();
  let slotTime = "";

  await test.step("гость занимает свободный слот", async () => {
    await expect(freeDay).toBeVisible();
    await freeDay.click();

    await expect(freeSlot).toBeVisible();
    slotTime = (await freeSlot.innerText()).trim();
    await freeSlot.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(eventTypeTitle);

    await sheet.getByLabel("Имя").fill(guest.name);
    await sheet.getByLabel("Email").fill(guest.email);
    await sheet.getByRole("button", { name: "Подтвердить запись" }).click();
  });

  await test.step("гость видит подтверждение записи", async () => {
    await expect(page.getByText("Запись подтверждена")).toBeVisible();
    await expect(page.getByText(eventTypeTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(guest.name, { exact: false })).toBeVisible();
    await expect(page.getByText(slotTime).first()).toBeVisible();
  });

  await test.step("владелец видит запись в списке предстоящих", async () => {
    await page.goto("/admin");

    await expect(page.getByRole("heading", { level: 1, name: "Админка" })).toBeVisible();

    const feed = page.getByRole("region", { name: "Предстоящие записи" });
    await expect(feed).toContainText(guest.name);
    await expect(feed).toContainText(guest.email);
    await expect(feed).toContainText(eventTypeTitle);
    await expect(feed).toContainText(slotTime);
  });
});
