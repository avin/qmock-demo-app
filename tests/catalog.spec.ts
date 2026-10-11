import { createMockTest, applyMocks } from "@avinlab/qmock/playwright";
import { expect, test as base } from "@playwright/test";
import emptyCatalog from "../src/mocks/overrides/catalog/empty";
import checkoutFailure from "../src/mocks/overrides/orders/failure";
import guest from "../src/mocks/overrides/profile/anonymous";

const test = createMockTest(base);

test("invalid catalog response shows an error and can be retried", async ({ page, mockScope }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mockScope.set({ "GET /api/products": {} });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Приятно быть дома." })).toBeVisible();
  await expect(page.getByText("Сервер вернул некорректный каталог товаров")).toBeVisible();
  expect(errors).toEqual([]);
  mockScope.clear();
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Подробнее: Лампа Orbit" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("shop supports catalog and checkout with base handlers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Подробнее: Лампа Orbit" })).toBeVisible();
  await page.getByRole("button", { name: "Растения", exact: true }).click();
  await expect(page.getByRole("button", { name: "Подробнее: Монстера" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подробнее: Лампа Orbit" })).toHaveCount(0);
  await page.getByRole("button", { name: "Всё", exact: true }).click();
  await page.getByRole("button", { name: "В корзину", exact: true }).first().click();
  await page.getByLabel("Почта для чека").fill("demo@example.com");
  await page.getByRole("button", { name: "Оформить заказ", exact: true }).click();
  await expect(page.getByText(/Заказ ORD-.*принят!/)).toBeVisible();
  expect(errors).toEqual([]);
});

const emptyTest = createMockTest(base, { overrides: [emptyCatalog, guest] });
emptyTest("imported scenarios show an empty catalog and guest profile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Пока ничего не нашлось")).toBeVisible();
  await expect(page.getByText("Вы зашли как гость")).toBeVisible();
});

const failedCheckoutTest = createMockTest(base, {
  overrides: [
    { override: checkoutFailure, params: { status: "503", message: "Checkout offline" } },
  ],
});
failedCheckoutTest(
  "checkout error retains the cart and temporary recovery patch can replace it",
  async ({ page, mockScope }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "В корзину", exact: true }).first().click();
    await page.getByLabel("Почта для чека").fill("demo@example.com");
    await page.getByRole("button", { name: "Оформить заказ", exact: true }).click();
    await expect(page.getByText("Checkout offline")).toBeVisible();
    await expect(page.getByRole("button", { name: "Удалить Лампа Orbit" })).toBeVisible();
    mockScope.set({
      "POST /api/orders": {
        kind: "mock-response",
        status: 201,
        body: { id: "RECOVERY", total: 4200, status: "confirmed" },
      },
    });
    await page.getByRole("button", { name: "Оформить заказ", exact: true }).click();
    await expect(page.getByText("Заказ RECOVERY принят!")).toBeVisible();
  },
);

base("separate browser contexts have independent mocks", async ({ browser }) => {
  const first = await browser.newContext({ serviceWorkers: "block" });
  const second = await browser.newContext({ serviceWorkers: "block" });
  const firstMocks = await applyMocks(first, { overrides: [emptyCatalog] });
  const secondMocks = await applyMocks(second);
  try {
    const firstPage = await first.newPage();
    const secondPage = await second.newPage();
    await Promise.all([
      firstPage.goto("http://127.0.0.1:4173/"),
      secondPage.goto("http://127.0.0.1:4173/"),
    ]);
    await expect(firstPage.getByText("Пока ничего не нашлось")).toBeVisible();
    await expect(secondPage.getByRole("button", { name: "Подробнее: Лампа Orbit" })).toBeVisible();
  } finally {
    await Promise.all([firstMocks.dispose(), secondMocks.dispose()]);
    await Promise.all([first.close(), second.close()]);
  }
});
