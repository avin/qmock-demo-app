import { defineMockOverride } from "@avinlab/qmock";
import { boundedNumber } from "../_helpers/products";
export default defineMockOverride({
  name: "Shipping fee",
  description:
    "Add a fee to the current successful total. Place before or after Checkout discount to see order-dependent composition.",
  params: { fee: { type: "string", default: "500" } },
  override: ({ fee }) => ({
    "POST /api/orders": (body) =>
      typeof body?.total === "number"
        ? { ...body, total: body.total + boundedNumber(fee, 500, 100000) }
        : undefined,
  }),
});
