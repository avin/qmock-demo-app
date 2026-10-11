import { defineMockOverride } from "@avinlab/qmock";
import type { MockRouteModifier } from "@avinlab/qmock";
import { boundedNumber } from "../_helpers/products";
export default defineMockOverride({
  name: "Slow network",
  description:
    "Async modifiers delay every demo API while preserving bodies, bytes, text and status.",
  params: { milliseconds: { type: "string", default: "1500", options: ["300", "1500", "3000"] } },
  override: ({ milliseconds }) => {
    const delay: MockRouteModifier = async () => {
      await new Promise((resolve) => setTimeout(resolve, boundedNumber(milliseconds, 1500, 10000)));
      return undefined;
    };
    return {
      "GET /api/products": delay,
      "GET /api/products/*": delay,
      "GET /api/profile": delay,
      "POST /api/orders": delay,
      "POST /api/contact": delay,
      "GET /api/notice": delay,
      "GET /api/catalog-export": delay,
    };
  },
});
