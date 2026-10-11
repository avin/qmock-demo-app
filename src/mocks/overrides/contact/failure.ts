import { defineMockOverride, json } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Newsletter unavailable",
  description: "Fail the URL-encoded newsletter submission independently of checkout.",
  params: {
    message: { type: "string", default: "Подписка временно недоступна. Попробуйте позже." },
  },
  override: ({ message }) => ({ "POST /api/contact": json({ error: message }, 503) }),
});
