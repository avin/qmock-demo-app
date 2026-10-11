import { defineMockConfiguration, json, readFormData, readRequestBody } from "@avinlab/qmock";
import { products } from "./fixtures";

const validEmail = (email: unknown): email is string =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default defineMockConfiguration({
  handlers: {
    "GET /api/products": ({ url }) => {
      const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const category = url.searchParams.get("category");
      return {
        items: products.filter(
          (product) =>
            (!category || category === "all" || category === product.category) &&
            `${product.name} ${product.description}`.toLowerCase().includes(query),
        ),
      };
    },
    "GET /api/products/*": ({ url }) => {
      const product = products.find(
        (item) => item.id === decodeURIComponent(url.pathname.slice("/api/products/".length)),
      );
      return product ?? json({ error: "Товар не найден" }, 404);
    },
    "GET /api/profile": { name: "Александра", role: "customer", discount: 0 },
    "POST /api/orders": async (request) => {
      let input: unknown;
      try {
        input = JSON.parse(await readRequestBody(request));
      } catch {
        return json({ error: "Некорректный JSON" }, 400);
      }
      if (
        !input ||
        typeof input !== "object" ||
        !("email" in input) ||
        !validEmail(input.email) ||
        !("items" in input) ||
        !Array.isArray(input.items) ||
        input.items.length === 0
      ) {
        return json({ error: "Укажите email и товары для заказа" }, 400);
      }
      const quantities = new Map<string, number>();
      for (const item of input.items) {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.productId !== "string" ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1
        ) {
          return json({ error: "Некорректный товар или количество" }, 400);
        }
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }
      let total = 0;
      for (const [id, quantity] of quantities) {
        const product = products.find((item) => item.id === id);
        if (!product) {
          return json({ error: "Товар не найден" }, 400);
        }
        if (quantity > product.stock) {
          return json({ error: `Недостаточно товара: ${product.name}` }, 400);
        }
        total += product.price * quantity;
      }
      return json(
        { id: `ORD-${Date.now().toString(36).toUpperCase()}`, total, status: "confirmed" },
        201,
      );
    },
    "POST /api/contact": async (request) => {
      const form = await readFormData(request);
      return validEmail(form.get("email"))
        ? { message: "Спасибо! Мы напишем вам о новых коллекциях." }
        : json({ error: "Укажите корректный email" }, 400);
    },
    "GET /api/notice": {
      kind: "mock-response",
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-QMock-Demo": "base" },
      text: "Бесплатная доставка заказов от 5 000 ₽",
    },
    "GET /api/catalog-export": () => ({
      kind: "mock-response",
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="catalog.csv"',
      },
      data: new TextEncoder().encode(
        "\uFEFFid,name,category,price,stock\n" +
          products
            .map(
              (product) =>
                `${product.id},${product.name},${product.category},${product.price},${product.stock}`,
            )
            .join("\n"),
      ),
    }),
  },
});
