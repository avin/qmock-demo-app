import { defineMockOverride, json } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Catalog unavailable",
  description: "Fail both the list and wildcard detail requests.",
  params: {
    message: { type: "string", default: "Каталог временно недоступен. Попробуйте ещё раз." },
  },
  override: ({ message }) => ({
    "GET /api/products": json({ error: message }, 503),
    "GET /api/products/*": json({ error: message }, 503),
  }),
});
