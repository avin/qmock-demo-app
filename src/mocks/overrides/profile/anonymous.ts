import { defineMockOverride, json } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Anonymous customer",
  description: "Return explicit JSON null instead of disabling the mock.",
  override: () => ({ "GET /api/profile": json(null) }),
});
