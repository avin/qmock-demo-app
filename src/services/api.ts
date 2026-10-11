import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  emoji: string;
  description: string;
}
export interface Profile {
  name: string;
  role: "customer" | "vip";
  discount: number;
}
export interface Order {
  id: string;
  total: number;
  status: string;
}
export interface OrderInput {
  items: { productId: string; quantity: number }[];
  email: string;
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "emoji" in value &&
    typeof value.emoji === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    "stock" in value &&
    typeof value.stock === "number" &&
    Number.isSafeInteger(value.stock) &&
    value.stock >= 0
  );
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    products: builder.query<{ items: Product[] }, { q: string; category: string }>({
      async queryFn(params, _queryApi, _extraOptions, baseQuery) {
        const result = await baseQuery({ url: "/products", params });
        if (result.error) {
          return { error: result.error };
        }
        const data = result.data;
        if (
          !data ||
          typeof data !== "object" ||
          !("items" in data) ||
          !Array.isArray(data.items) ||
          !data.items.every(isProduct)
        ) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: "Invalid catalog response",
              data: { error: "Сервер вернул некорректный каталог товаров" },
            },
          };
        }
        return { data: { items: data.items } };
      },
    }),
    profile: builder.query<Profile | null, void>({ query: () => "/profile" }),
    product: builder.query<Product, string>({
      query: (id) => `/products/${encodeURIComponent(id)}`,
    }),
    notice: builder.query<string, void>({
      query: () => ({ url: "/notice", responseHandler: "text", headers: { Accept: "text/plain" } }),
    }),
    order: builder.mutation<Order, OrderInput>({
      query: (body) => ({ url: "/orders", method: "POST", body }),
    }),
    contact: builder.mutation<{ message: string }, string>({
      query: (email) => ({
        url: "/contact",
        method: "POST",
        body: new URLSearchParams({ email }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    }),
  }),
});

export const {
  useProductsQuery,
  useProfileQuery,
  useProductQuery,
  useNoticeQuery,
  useOrderMutation,
  useContactMutation,
} = api;
