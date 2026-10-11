import { defineMockOverride } from "@avinlab/qmock";
export default defineMockOverride({
  name: "Custom announcement",
  description: "Replace a text envelope and include a custom response header.",
  params: { text: { type: "string", default: "Сегодня доставка всех заказов бесплатная!" } },
  override: ({ text }) => ({
    "GET /api/notice": {
      kind: "mock-response",
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-QMock-Demo": "override" },
      text,
    },
  }),
});
