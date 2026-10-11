import { defineMockOverride } from "@avinlab/qmock";
import { boundedNumber, transformProducts } from "../_helpers/products";

export default defineMockOverride({
  name: "Stock control",
  description:
    "Change stock on the list and wildcard details without changing checkout fixture validation.",
  params: {
    available: { type: "boolean", default: false },
    quantity: { type: "string", default: "3" },
  },
  override: ({ available, quantity }) => {
    const patch = transformProducts((product) => ({
      ...product,
      stock: available ? Math.floor(boundedNumber(quantity, 3, 999)) : 0,
    }));
    return { "GET /api/products": patch, "GET /api/products/*": patch };
  },
});
