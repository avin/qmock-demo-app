import { defineMockOverride } from "@avinlab/qmock";
import { boundedNumber, transformProducts } from "../_helpers/products";

export default defineMockOverride({
  name: "Product discount",
  description:
    "Reduce current catalog and detail prices. Composes with earlier modifiers; checkout keeps fixture prices.",
  params: { percent: { type: "string", default: "20", options: ["10", "20", "50"] } },
  override: ({ percent }) => {
    const patch = transformProducts((product) => ({
      ...product,
      price: Math.round(Number(product.price) * (1 - boundedNumber(percent, 20, 100) / 100)),
    }));
    return { "GET /api/products": patch, "GET /api/products/*": patch };
  },
});
