import type { JsonObject, JsonValue, MockRouteModifier } from "@avinlab/qmock";

export function transformProducts(
  transform: (product: JsonObject) => JsonObject,
): MockRouteModifier {
  return (body) => {
    if (!body) {
      return undefined;
    }
    if (Array.isArray(body.items)) {
      return {
        ...body,
        items: body.items.map((item: JsonValue) =>
          typeof item === "object" && item !== null && !Array.isArray(item)
            ? transform(item)
            : item,
        ),
      };
    }
    return typeof body.id === "string" ? transform(body) : undefined;
  };
}

export const boundedNumber = (value: string, fallback: number, max: number) => {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number)
    ? Math.max(0, Math.min(max, number))
    : fallback;
};
