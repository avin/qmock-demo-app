import { defineMockOverride } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Notice pass-through",
  description:
    "A null patch disables the notice mock. With no backend/proxy the development server returns 404.",
  override: () => ({ "GET /api/notice": null }),
});
