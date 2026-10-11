import { defineMockOverride, json } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Missing product detail",
  description: "Wildcard override: list works but any individual product returns 404.",
  override: () => ({
    "GET /api/products/*": json({ error: "Этот товар больше не продаётся" }, 404),
  }),
});
