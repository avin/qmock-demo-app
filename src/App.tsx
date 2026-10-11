import {
  ArrowUpRight,
  Download,
  Leaf,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { add, clear, remove } from "@/app/cart";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RequestError } from "@/components/RequestError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  useContactMutation,
  useNoticeQuery,
  useOrderMutation,
  useProductQuery,
  useProductsQuery,
  useProfileQuery,
} from "@/services/api";

const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

function ProductDetails({ id, close }: { id: string; close: () => void }) {
  const { data, error, isFetching } = useProductQuery(id);
  return (
    <Card className="mb-6 border border-emerald-200" aria-label="Информация о товаре">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">О товаре</p>
          {isFetching ? (
            <Skeleton className="h-16 w-60" />
          ) : (
            data && (
              <>
                <h3 className="font-semibold">
                  {data.emoji} {data.name}
                </h3>
                <p>{data.description}</p>
                <p className="text-muted-foreground">
                  На складе: {data.stock} · {money(data.price)}
                </p>
              </>
            )
          )}
          <RequestError error={error} />
        </div>
        <Button variant="ghost" size="icon" aria-label="Закрыть информацию" onClick={close}>
          <X />
        </Button>
      </CardContent>
    </Card>
  );
}

function App() {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const products = useProductsQuery({ q, category });
  const profile = useProfileQuery();
  const notice = useNoticeQuery();
  const [order, orderState] = useOrderMutation();
  const [contact, contactState] = useContactMutation();
  const subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const discount = profile.data?.discount ?? 0;
  const total = Math.round(subtotal * (1 - discount / 100));
  const refresh = () => {
    dispatch(api.util.resetApiState());
    orderState.reset();
    contactState.reset();
  };

  return (
    <div className="min-h-screen bg-[#f6f7f3] text-[#20372c]">
      <header className="border-b bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Leaf className="text-emerald-700" /> little things
            <span className="text-muted-foreground ml-2 text-xs font-normal">demo shop</span>
          </a>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={orderState.isLoading} onClick={refresh}>
              <RefreshCw /> Обновить данные
            </Button>
            <Button asChild>
              <a href="/__apiMock" target="_blank" rel="noreferrer">
                Сценарии QMock <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Маленькие вещи для хорошего дня</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Приятно быть дома.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl">
              Немного зелени, любимая чашка и порядок на столе. Соберите свой уютный набор.
            </p>
          </div>
          <div className="rounded-2xl border bg-white px-5 py-4 text-sm">
            {(() => {
              if (profile.isFetching) {
                return <Skeleton className="h-10 w-36" />;
              }
              if (profile.data) {
                return (
                  <>
                    <p className="font-medium">
                      Привет, {profile.data.name}{" "}
                      <Badge variant="secondary">
                        {profile.data.role === "vip" ? "VIP" : "Покупатель"}
                      </Badge>
                    </p>
                    <p className="text-muted-foreground mt-1">Ваша скидка: {discount}%</p>
                  </>
                );
              }
              return <p>Вы зашли как гость</p>;
            })()}
            <RequestError error={profile.error} />
          </div>
        </div>
        {notice.data && !notice.error && (
          <div className="mb-8 rounded-xl bg-[#e7eee1] px-5 py-3 text-sm">{notice.data}</div>
        )}
        <RequestError error={notice.error} />
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          <section aria-label="Каталог">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Каталог{" "}
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {products.data?.items.length ?? 0} товаров
                </span>
              </h2>
              <a
                href="/api/catalog-export"
                download="catalog.csv"
                className="flex items-center gap-2 text-sm underline underline-offset-4"
              >
                <Download size={15} /> Скачать CSV
              </a>
            </div>
            <form
              className="mb-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQ(search);
              }}
            >
              <Input
                aria-label="Поиск товаров"
                placeholder="Найти что-то приятное…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-white"
              />
              <Button type="submit">Найти</Button>
            </form>
            <div className="mb-6 flex flex-wrap gap-2">
              {["", "Растения", "Посуда", "Для дома"].map((value) => (
                <Button
                  key={value}
                  variant={category === value ? "default" : "outline"}
                  onClick={() => setCategory(value)}
                >
                  {value || "Всё"}
                </Button>
              ))}
            </div>
            {selected && <ProductDetails id={selected} close={() => setSelected(null)} />}
            {(() => {
              if (products.isFetching) {
                return (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <Skeleton key={n} className="h-72 rounded-2xl" />
                    ))}
                  </div>
                );
              }
              if (products.isError) {
                return (
                  <div className="space-y-3">
                    <RequestError error={products.error} />
                    <Button onClick={() => void products.refetch()}>Повторить</Button>
                  </div>
                );
              }
              if (products.data?.items.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed p-12 text-center">
                    <Leaf className="mx-auto mb-3" />
                    <h3 className="font-semibold">Пока ничего не нашлось</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Попробуйте другое название или категорию.
                    </p>
                  </div>
                );
              }
              return (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {products.data?.items.map((product, index) => {
                    const quantity =
                      cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
                    let buttonLabel = "Нет в наличии";
                    if (product.stock) {
                      buttonLabel =
                        quantity >= product.stock ? "Всё доступное в корзине" : "В корзину";
                    }
                    return (
                      <Card key={product.id} className="gap-0 pt-0 shadow-none">
                        <button
                          className={`product-art art-${index % 3}`}
                          onClick={() => setSelected(product.id)}
                          aria-label={`Подробнее: ${product.name}`}
                        >
                          <span>{product.emoji}</span>
                          <span className="art-caption">
                            LITTLE THINGS / {String(index + 1).padStart(2, "0")}
                          </span>
                        </button>
                        <CardContent className="space-y-3 pt-4">
                          <p className="eyebrow text-[10px]">{product.category}</p>
                          <button
                            className="text-left font-semibold"
                            onClick={() => setSelected(product.id)}
                          >
                            {product.name}
                          </button>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium">{money(product.price)}</span>
                            <Badge variant={product.stock ? "secondary" : "outline"}>
                              {product.stock ? `${product.stock} в наличии` : "Нет в наличии"}
                            </Badge>
                          </div>
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={orderState.isLoading || quantity >= product.stock}
                            onClick={() => {
                              dispatch(add(product));
                              orderState.reset();
                            }}
                          >
                            <Plus />
                            {buttonLabel}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </section>
          <aside className="space-y-5 lg:sticky lg:top-6">
            <Card className="shadow-none">
              <CardContent>
                <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold">
                  <ShoppingBag size={20} /> Ваш набор{" "}
                  <Badge variant="secondary">
                    {cart.reduce((n, item) => n + item.quantity, 0)}
                  </Badge>
                </h2>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-sm">
                    Здесь появятся ваши находки. Добавьте что-нибудь из каталога.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <span className="text-2xl">{item.product.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.quantity} × {money(item.product.price)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Удалить ${item.product.name}`}
                          disabled={orderState.isLoading}
                          onClick={() => {
                            dispatch(remove(item.product.id));
                            orderState.reset();
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="my-5 space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span>Сумма</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Скидка {discount}%</span>
                    <span>−{money(subtotal - total)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-lg font-semibold">
                    <span>Итого</span>
                    <span>{money(total)}</span>
                  </div>
                </div>
                <form
                  className="space-y-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      await order({
                        items: cart.map((item) => ({
                          productId: item.product.id,
                          quantity: item.quantity,
                        })),
                        email,
                      }).unwrap();
                      dispatch(clear());
                    } catch {
                      /* Error is displayed by mutation state. */
                    }
                  }}
                >
                  <label className="text-sm" htmlFor="order-email">
                    Почта для чека
                  </label>
                  <Input
                    id="order-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={!cart.length || orderState.isLoading}
                  >
                    {orderState.isLoading ? "Оформляем…" : "Оформить заказ"}
                  </Button>
                </form>
                <div className="mt-4" aria-live="polite">
                  <RequestError error={orderState.error} />
                  {orderState.data && (
                    <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                      <p className="font-semibold">Заказ {orderState.data.id} принят!</p>
                      <p>
                        {money(orderState.data.total)} · {orderState.data.status}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#e7eee1] shadow-none">
              <CardContent>
                <p className="eyebrow mb-2">Письма с хорошими новостями</p>
                <p className="mb-4 text-sm">Узнавайте о новых коллекциях первыми.</p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void contact(contactEmail);
                  }}
                >
                  <Input
                    aria-label="Почта для подписки"
                    type="email"
                    required
                    placeholder="Ваш email"
                    value={contactEmail}
                    onChange={(event) => {
                      setContactEmail(event.target.value);
                      contactState.reset();
                    }}
                    className="bg-white"
                  />
                  <Button variant="outline" className="w-full" disabled={contactState.isLoading}>
                    {contactState.isLoading ? "Подписываем…" : "Подписаться"}
                  </Button>
                </form>
                <div className="mt-3 text-sm" aria-live="polite">
                  {contactState.data?.message}
                  <RequestError error={contactState.error} />
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
        <footer className="text-muted-foreground mt-12 border-t pt-6 text-sm">
          Little things · учебный магазин с API-моками. Заказы и подписка демонстрационные.
        </footer>
      </main>
    </div>
  );
}
export default App;
