import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { apiMockPlugin } from "@avinlab/qmock";
import { createServer } from "vite";

const entry = (id, params = {}, isEnabled = true) => ({ id, params, isEnabled });
const leaves = (nodes) =>
  nodes.flatMap((node) => (node.kind === "group" ? leaves(node.children) : [node]));

// A separate development server keeps the developer's saved dashboard settings intact.
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("../", import.meta.url)),
  plugins: [apiMockPlugin({ stateFile: false })],
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: "127.0.0.1", port: 0, open: false },
});
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const request = (path, init) =>
    fetch(new URL(path, base), {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  const get = async (path) => (await request(path)).json();
  const activate = async (...active) => {
    const response = await request("/__apiMocks/overrides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  const order = async (
    body = { items: [{ productId: "lamp", quantity: 1 }], email: "test@example.com" },
  ) =>
    request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  assert.equal((await request("/__apiMock", { headers: { Accept: "text/html" } })).status, 200);
  const catalog = await get("/__apiMocks/overrides");
  const discovered = leaves(catalog.tree);
  assert.equal(discovered.length, 14);
  assert.ok(discovered.every((item) => !item.id.includes("_helpers")));

  const baseProducts = await get("/api/products");
  assert.equal(baseProducts.items.length, 6);
  assert.equal(
    (await get("/api/products?category=" + encodeURIComponent("Растения"))).items.length,
    2,
  );
  assert.equal((await get("/api/products?q=" + encodeURIComponent("лампа"))).items[0].id, "lamp");
  assert.equal((await get("/api/products/lamp")).price, 4200);
  assert.equal((await request("/api/products/unknown")).status, 404);
  assert.equal((await get("/api/profile")).role, "customer");
  let response = await order();
  assert.equal(response.status, 201);
  assert.equal((await response.json()).total, 4200);
  assert.equal(
    (await order({ items: [{ productId: "cactus", quantity: 1 }], email: "test@example.com" }))
      .status,
    400,
  );
  assert.equal(
    (
      await order({
        items: [
          { productId: "lamp", quantity: 7 },
          { productId: "lamp", quantity: 7 },
        ],
        email: "test@example.com",
      })
    ).status,
    400,
  );
  assert.equal((await order({ items: [], email: "invalid" })).status, 400);
  assert.equal((await request("/api/orders", { method: "POST", body: "{bad-json" })).status, 400);
  response = await request("/api/contact", {
    method: "POST",
    body: new URLSearchParams({ email: "test@example.com" }),
  });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).message);
  assert.equal(
    (
      await request("/api/contact", {
        method: "POST",
        body: new URLSearchParams({ email: "invalid" }),
      })
    ).status,
    400,
  );
  response = await request("/api/notice");
  assert.equal(response.headers.get("x-qmock-demo"), "base");
  assert.ok((await response.text()).includes("5 000"));
  response = await request("/api/catalog-export");
  assert.ok(response.headers.get("content-disposition").includes("catalog.csv"));
  assert.ok((await response.text()).includes("lamp,Лампа Orbit"));

  await activate(
    entry("catalog/discount", { percent: "50" }),
    entry("catalog/stock", { available: true, quantity: "9" }),
  );
  assert.equal((await get("/api/products")).items[0].price, 2100);
  const detail = await get("/api/products/lamp");
  assert.equal(detail.price, 2100);
  assert.equal(detail.stock, 9);
  await activate(entry("catalog/empty"), entry("catalog/discount"));
  assert.equal((await get("/api/products")).items.length, 0);
  await activate(entry("catalog/failure", { message: "offline" }));
  assert.equal((await request("/api/products")).status, 503);
  assert.equal((await request("/api/products/lamp")).status, 503);
  await activate(entry("catalog/detail"));
  assert.equal((await request("/api/products/lamp")).status, 404);
  assert.equal((await get("/api/products")).items.length, 6);
  await activate(entry("profile/customer", { name: "Smoke", role: "vip" }));
  assert.deepEqual(await get("/api/profile"), { name: "Smoke", role: "vip", discount: 10 });
  await activate(entry("profile/anonymous"));
  assert.equal(await get("/api/profile"), null);
  await activate(entry("profile/anonymous", {}, false));
  assert.equal((await get("/api/profile")).role, "customer");

  await activate(entry("network/delay", { milliseconds: "300" }));
  const start = performance.now();
  assert.equal((await get("/api/products")).items.length, 6);
  assert.ok(performance.now() - start >= 280);
  response = await request("/api/catalog-export");
  assert.ok((await response.text()).includes("lamp,Лампа Orbit"));
  // Each scenario changes shared server state, so requests must run sequentially.
  /* oxlint-disable no-await-in-loop */
  for (const status of ["400", "503"]) {
    await activate(
      entry("orders/failure", { status, message: "test failure" }),
      entry("orders/discount"),
    );
    response = await order();
    assert.equal(response.status, Number(status));
    assert.deepEqual(await response.json(), { error: "test failure" });
  }
  /* oxlint-enable no-await-in-loop */
  await activate(
    entry("orders/discount", { percent: "20" }),
    entry("orders/shipping", { fee: "500" }),
  );
  response = await order();
  assert.equal(response.status, 201);
  assert.equal((await response.json()).total, 3860);
  await activate(
    entry("orders/shipping", { fee: "500" }),
    entry("orders/discount", { percent: "20" }),
  );
  assert.equal((await (await order()).json()).total, 3760);

  await activate(entry("contact/failure", { message: "Newsletter offline" }));
  response = await request("/api/contact", {
    method: "POST",
    body: new URLSearchParams({ email: "test@example.com" }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Newsletter offline" });

  await activate(entry("notice/custom", { text: "Hello smoke" }));
  response = await request("/api/notice");
  assert.equal(response.headers.get("x-qmock-demo"), "override");
  assert.equal(await response.text(), "Hello smoke");
  await activate(entry("notice/passthrough"));
  assert.equal((await request("/api/notice")).status, 404);
  await activate(entry("notice/passthrough"), entry("notice/custom", { text: "Restored" }));
  assert.equal(await (await request("/api/notice")).text(), "Restored");
  assert.equal((await request("/api/unmatched-demo")).status, 404);

  console.info(
    "QMock dev plugin smoke passed: handlers, 14 overrides, dashboard composition and pass-through.",
  );
} finally {
  await server.close();
}
