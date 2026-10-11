import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "@/services/api";

export interface CartItem {
  product: Product;
  quantity: number;
}
const cart = createSlice({
  name: "cart",
  initialState: [] as CartItem[],
  reducers: {
    add(state, { payload }: PayloadAction<Product>) {
      const item = state.find((entry) => entry.product.id === payload.id);
      if (item) {
        item.quantity += 1;
      } else {
        state.push({ product: payload, quantity: 1 });
      }
    },
    remove(state, { payload }: PayloadAction<string>) {
      return state.filter((entry) => entry.product.id !== payload);
    },
    clear() {
      return [];
    },
  },
});
export const { add, remove, clear } = cart.actions;
export const cartReducer = cart.reducer;
