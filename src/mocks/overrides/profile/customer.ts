import { defineMockOverride } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Customer profile",
  description: "Customize the customer name and membership.",
  params: {
    name: { type: "string", default: "Михаил" },
    role: { type: "string", default: "vip", options: ["customer", "vip"] },
  },
  override: ({ name, role }) => ({
    "GET /api/profile": (body) => ({ ...body, name, role, discount: role === "vip" ? 10 : 0 }),
  }),
});
