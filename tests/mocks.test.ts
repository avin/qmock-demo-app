// Oxlint does not recognize test blocks created by Vitest's test.extend fixture API.
/* oxlint-disable vitest/no-standalone-expect */
import { json } from "@avinlab/qmock";
import { createMockScope, withMocks } from "@avinlab/qmock/vitest";
import type { VitestMockScope } from "@avinlab/qmock/vitest";
import { expect, test as base, vi } from "vitest";
import { products } from "../src/mocks/fixtures";
import configuration from "../src/mocks/handlers";
import catalogDetail from "../src/mocks/overrides/catalog/detail";
import catalogDiscount from "../src/mocks/overrides/catalog/discount";
import catalogEmpty from "../src/mocks/overrides/catalog/empty";
import catalogFailure from "../src/mocks/overrides/catalog/failure";
import catalogStock from "../src/mocks/overrides/catalog/stock";
import contactFailure from "../src/mocks/overrides/contact/failure";
import networkDelay from "../src/mocks/overrides/network/delay";
import noticeCustom from "../src/mocks/overrides/notice/custom";
import noticePassthrough from "../src/mocks/overrides/notice/passthrough";
import ordersDiscount from "../src/mocks/overrides/orders/discount";
import ordersFailure from "../src/mocks/overrides/orders/failure";
import ordersShipping from "../src/mocks/overrides/orders/shipping";
import profileAnonymous from "../src/mocks/overrides/profile/anonymous";
import profileCustomer from "../src/mocks/overrides/profile/customer";

const test = base.extend<{ mocks: VitestMockScope }>({ mocks: withMocks() });
const get = async (path: string) => (await fetch(path)).json();
const order = (
  body: unknown = {
    items: [{ productId: "lamp", quantity: 1 }],
    email: "test@example.com",
  },
) =>
  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("loads base handlers without a Vite or API server", async ({ mocks }) => {
  await mocks.run(async () => {
    expect((await get("/api/products")).items).toEqual(products);
    expect(
      (await get("/api/products?category=" + encodeURIComponent("Растения"))).items,
    ).toHaveLength(2);
    expect((await get("/api/products?q=" + encodeURIComponent("лампа"))).items[0].id).toBe("lamp");
    expect((await get("/api/products/lamp")).price).toBe(4200);
    expect((await fetch("/api/products/unknown")).status).toBe(404);
    expect((await get("/api/profile")).role).toBe("customer");

    const response = await order();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ total: 4200, status: "confirmed" });
  });
});

test.each([
  { items: [], email: "invalid" },
  { items: [{ productId: "unknown", quantity: 1 }], email: "test@example.com" },
  { items: [{ productId: "cactus", quantity: 1 }], email: "test@example.com" },
  { items: [{ productId: "lamp", quantity: 0 }], email: "test@example.com" },
  { items: [{ productId: "lamp", quantity: 1.5 }], email: "test@example.com" },
  {
    items: [
      { productId: "lamp", quantity: 7 },
      { productId: "lamp", quantity: 7 },
    ],
    email: "test@example.com",
  },
])("rejects invalid checkout: %j", async (input) => {
  const mocks = await createMockScope();
  await mocks.run(async () => expect((await order(input)).status).toBe(400));
});

test("handles malformed JSON and URL-encoded newsletter forms", async ({ mocks }) => {
  await mocks.run(async () => {
    expect((await fetch("/api/orders", { method: "POST", body: "{bad-json" })).status).toBe(400);
    const response = await fetch("/api/contact", {
      method: "POST",
      body: new URLSearchParams({ email: "test@example.com" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("message");
    expect(
      (
        await fetch("/api/contact", {
          method: "POST",
          body: new URLSearchParams({ email: "invalid" }),
        })
      ).status,
    ).toBe(400);
  });
});

test("preserves text headers and binary CSV responses", async ({ mocks }) => {
  await mocks.run(async () => {
    const notice = await fetch("/api/notice");
    expect(notice.headers.get("x-qmock-demo")).toBe("base");
    expect(await notice.text()).toContain("5 000");
    const csv = await fetch("/api/catalog-export");
    expect(csv.headers.get("content-disposition")).toContain("catalog.csv");
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const bytes = new Uint8Array(await csv.arrayBuffer());
    expect(bytes.slice(0, 3)).toEqual(new Uint8Array([239, 187, 191]));
    expect(new TextDecoder().decode(bytes)).toContain("lamp,Лампа Orbit");
  });
});

test("uses imported defaults and custom parameters on list and wildcard routes", async () => {
  const defaults = await createMockScope({
    overrides: [catalogDiscount, catalogStock, profileCustomer],
  });
  await defaults.run(async () => {
    expect((await get("/api/products")).items[0]).toMatchObject({ price: 3360, stock: 0 });
    expect(await get("/api/products/lamp")).toMatchObject({ price: 3360, stock: 0 });
    expect(await get("/api/profile")).toEqual({ name: "Михаил", role: "vip", discount: 10 });
  });
  const customized = await createMockScope({
    configuration,
    overrides: [
      { override: catalogDiscount, params: { percent: "50" } },
      { override: catalogStock, params: { available: true, quantity: "9" } },
      { override: profileCustomer, params: { name: "Test Customer", role: "customer" } },
    ],
  });
  await customized.run(async () => {
    expect(await get("/api/products/lamp")).toMatchObject({ price: 2100, stock: 9 });
    expect(await get("/api/profile")).toEqual({
      name: "Test Customer",
      role: "customer",
      discount: 0,
    });
    // Catalog patches demonstrate composition; checkout still validates fixture stock/prices.
    expect(await (await order()).json()).toMatchObject({ total: 4200 });
  });
});

test("composes empty catalogs and preserves wildcard failures", async () => {
  const empty = await createMockScope({ overrides: [catalogEmpty, catalogDiscount] });
  await empty.run(async () => expect((await get("/api/products")).items).toEqual([]));
  const failed = await createMockScope({
    overrides: [{ override: catalogFailure, params: { message: "offline" } }, catalogDiscount],
  });
  await failed.run(async () => {
    const responses = await Promise.all([fetch("/api/products"), fetch("/api/products/lamp")]);
    expect(responses.map((response) => response.status)).toEqual([503, 503]);
    expect(await responses[0].json()).toEqual({ error: "offline" });
  });
  const missingDetail = await createMockScope({ overrides: [catalogDetail] });
  await missingDetail.run(async () => {
    expect((await fetch("/api/products/lamp")).status).toBe(404);
    expect((await get("/api/products")).items).toHaveLength(6);
  });
});

test.each([
  { overrides: [ordersDiscount, ordersShipping], total: 3860 },
  { overrides: [ordersShipping, ordersDiscount], total: 3760 },
])("applies checkout modifiers in array order: $total", async ({ overrides, total }) => {
  const mocks = await createMockScope({ overrides });
  await mocks.run(async () => {
    const response = await order();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ total });
    expect((await order({ items: [], email: "invalid" })).status).toBe(400);
  });
});

test.each(["400", "503"])("preserves checkout errors through modifiers: %s", async (status) => {
  const mocks = await createMockScope({
    overrides: [
      { override: ordersFailure, params: { status, message: "test failure" } },
      ordersDiscount,
      ordersShipping,
    ],
  });
  await mocks.run(async () => {
    const response = await order();
    expect(response.status).toBe(Number(status));
    expect(await response.json()).toEqual({ error: "test failure" });
  });
});

test("imports newsletter errors and announcement text overrides", async () => {
  const mocks = await createMockScope({
    overrides: [
      { override: contactFailure, params: { message: "Newsletter offline" } },
      { override: noticeCustom, params: { text: "Hello test" } },
    ],
  });
  await mocks.run(async () => {
    const contact = await fetch("/api/contact", {
      method: "POST",
      body: new URLSearchParams({ email: "test@example.com" }),
    });
    expect(contact.status).toBe(503);
    expect(await contact.json()).toEqual({ error: "Newsletter offline" });
    const notice = await fetch("/api/notice");
    expect(notice.headers.get("x-qmock-demo")).toBe("override");
    expect(await notice.text()).toBe("Hello test");
  });
});

test("awaits async delay modifiers without losing JSON, text or bytes", async () => {
  const mocks = await createMockScope({
    overrides: [{ override: networkDelay, params: { milliseconds: "300" } }],
  });
  await mocks.run(async () => {
    const started = performance.now();
    const [catalog, notice, csv] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/notice"),
      fetch("/api/catalog-export"),
    ]);
    expect(performance.now() - started).toBeGreaterThanOrEqual(280);
    expect((await catalog.json()).items).toHaveLength(6);
    expect(await notice.text()).toContain("5 000");
    expect(await csv.text()).toContain("lamp,Лампа Orbit");
  });
});

test("distinguishes JSON null from pass-through and forwards unmatched requests", async () => {
  // Local fallback proves delegation without contacting a backend or opening a server.
  const fallback = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response("downstream", { status: 202 }));
  try {
    const mocks = await createMockScope({ overrides: [profileAnonymous, noticePassthrough] });
    await mocks.run(async () => {
      expect(await get("/api/profile")).toBeNull();
      expect(fallback).not.toHaveBeenCalled();
      expect(await (await fetch("/api/notice")).text()).toBe("downstream");
      expect((await fetch("https://backend.example/api/unmatched")).status).toBe(202);
    });
    expect(fallback).toHaveBeenCalledTimes(2);
    const restored = await createMockScope({ overrides: [noticePassthrough, noticeCustom] });
    await restored.run(async () =>
      expect(await (await fetch("/api/notice")).text()).toBe(
        "Сегодня доставка всех заказов бесплатная!",
      ),
    );
    expect(fallback).toHaveBeenCalledTimes(2);
  } finally {
    fallback.mockRestore();
  }
});

test("keeps parallel and nested runs independent even with identical names", async () => {
  const originalFetch = globalThis.fetch;
  const first = await createMockScope({ name: "same-label", overrides: [profileCustomer] });
  const second = await createMockScope({ name: "same-label", overrides: [profileAnonymous] });
  await Promise.all([
    first.run(async () => {
      expect((await get("/api/profile")).name).toBe("Михаил");
      await second.run(async () => expect(await get("/api/profile")).toBeNull());
      expect((await get("/api/profile")).name).toBe("Михаил");
    }),
    second.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(await get("/api/profile")).toBeNull();
    }),
  ]);
  expect(globalThis.fetch).toBe(originalFetch);
});

test("set replaces temporary patches; clear and run completion restore initial patches", async () => {
  const mocks = await createMockScope({
    overrides: [profileCustomer],
    patches: { "GET /api/notice": { kind: "mock-response", text: "Initial notice" } },
  });
  mocks.set({ "GET /api/profile": json({ error: "Temporary" }, 503) });
  await mocks.run(async () => {
    expect((await fetch("/api/profile")).status).toBe(503);
    expect(await (await fetch("/api/notice")).text()).toContain("5 000");
    mocks.set({ "GET /api/notice": { kind: "mock-response", text: "Temporary notice" } });
    expect((await get("/api/profile")).name).toBe("Михаил");
    mocks.clear();
    expect(await (await fetch("/api/notice")).text()).toBe("Initial notice");
    mocks.set({ "GET /api/profile": json(null) });
    expect(await get("/api/profile")).toBeNull();
  });
  await mocks.run(async () => {
    expect((await get("/api/profile")).name).toBe("Михаил");
    expect(await (await fetch("/api/notice")).text()).toBe("Initial notice");
  });
});

test("restores global fetch and patches when application work throws", async ({ mocks }) => {
  const originalFetch = globalThis.fetch;
  mocks.set({ "GET /api/profile": json(null) });
  await expect(
    mocks.run(async () => {
      expect(await get("/api/profile")).toBeNull();
      throw new Error("application failed");
    }),
  ).rejects.toThrow("application failed");
  expect(globalThis.fetch).toBe(originalFetch);
  expect(await (await mocks.fetch("/api/profile")).json()).toHaveProperty("name", "Александра");
});

test("withMocks cleans up temporary patches even when its consumer throws", async () => {
  let usedScope: VitestMockScope | undefined;
  await expect(
    withMocks({ configuration })({}, async (mocks) => {
      usedScope = mocks;
      mocks.set({ "GET /api/profile": json(null) });
      expect(await (await mocks.fetch("/api/profile")).json()).toBeNull();
      throw new Error("fixture consumer failed");
    }),
  ).rejects.toThrow("fixture consumer failed");
  expect(await (await usedScope!.fetch("/api/profile")).json()).toHaveProperty(
    "name",
    "Александра",
  );
});
