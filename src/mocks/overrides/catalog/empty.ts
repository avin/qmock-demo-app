import { defineMockOverride } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Empty catalog",
  description: "Replace the list with an empty result for every filter.",
  override: () => ({ "GET /api/products": { items: [] } }),
});
