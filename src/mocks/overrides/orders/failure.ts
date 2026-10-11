import { defineMockOverride, json } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Checkout failure",
  description: "Replace checkout with a validation or service error.",
  params: {
    status: { type: "string", default: "503", options: ["400", "503"] },
    message: { type: "string", default: "Не удалось оформить заказ. Попробуйте снова." },
  },
  override: ({ status, message }) => ({
    "POST /api/orders": json({ error: message }, Number(status)),
  }),
});
