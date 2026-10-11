import { defineMockOverride } from "@avinlab/qmock";
import { boundedNumber } from "../_helpers/products";
export default defineMockOverride({
  name: "Checkout discount",
  description:
    "Reduce the current successful order total; 28% matches catalog 20% plus VIP 10%. Leaves validation errors unchanged.",
  params: { percent: { type: "string", default: "20", options: ["10", "20", "28", "50"] } },
  override: ({ percent }) => ({
    "POST /api/orders": (body) =>
      typeof body?.total === "number"
        ? { ...body, total: Math.round(body.total * (1 - boundedNumber(percent, 20, 100) / 100)) }
        : undefined,
  }),
});
