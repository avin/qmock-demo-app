# Магазин и QMock

Запуск: `npm run dev`. Откройте приложение и панель `/__apiMock` на том же адресе. API обслуживает Vite: бэкенд и учётная запись не нужны. Библиотека подключена локально из `../qmock`; после её изменения выполните `npm --prefix ../qmock run build` и перезапустите dev-сервер. QMock работает только в разработке, а `vite preview` и production-сборка не содержат мок-сервер.

## Контракт API

| Вызов                            | Поведение                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/products?q=&category=` | `{ items: Product[] }`, поиск по названию/описанию; категории `Растения`, `Посуда`, `Для дома`, пустая или `all` — все                                                                |
| `GET /api/products/:id`          | Один товар либо `{ error }` и 404. Маршрут `GET /api/products/*` — wildcard; точный маршрут списка имеет приоритет                                                                    |
| `GET /api/profile`               | `{ name, role: 'customer' \| 'vip', discount }` либо JSON `null` в сценарии гостя                                                                                                     |
| `POST /api/orders`               | JSON `{ items: [{ productId, quantity }], email }`; 201 с `{ id, total, status: 'confirmed' }`; 400 с `{ error }` при неверном JSON, email, товарах, количестве или нехватке остатков |
| `POST /api/contact`              | URL-encoded `email`, разобранный `readFormData`; `{ message }` либо 400 с `{ error }`                                                                                                 |
| `GET /api/notice`                | Текст и заголовок `X-QMock-Demo` через response envelope                                                                                                                              |
| `GET /api/catalog-export`        | CSV как `Uint8Array`, UTF-8, заголовок `Content-Disposition: attachment`                                                                                                              |

Товар: `{ id, name, category, price, stock, emoji, description }`. Цены в рублях. Заказ считает сумму по исходным фикстурам; повторяющиеся позиции суммируются при проверке остатка. Данные не записываются в БД, остатки после заказа не уменьшаются. Скидка и остатки сценария каталога меняют отображаемые ответы. Корзина применяет скидку профиля к полученным ценам, а базовый handler заказа об этом не знает: для согласованного результата активируйте `Checkout discount`. Например, каталог −20% и VIP-профиль −10% соответствуют скидке заказа **28%** (`0.8 × 0.9 = 0.72`); при базовом профиле без скидки — те же 20%, что в каталоге. `Stock control` меняет только list/detail responses: если показать отсутствующий кактус доступным, исходный handler всё равно вернёт 400 при заказе, демонстрируя конфликт клиентского состояния и серверной валидации.

## Панель сценариев

Найдите сценарий в каталоге и перетащите в **Active**. Шестерёнка открывает параметры; чекбокс отключает применение, сохраняя параметры. Переставьте строки, чтобы изменить порядок. Возврат строки в каталог удаляет сценарий. После изменения нажмите обновление данных в приложении: RTK Query хранит ответы в кэше, переключение сценария само по себе не повторяет ранее выполненные запросы.

| Группа / сценарий                | Что проверить                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Catalog / Product discount       | Параметр `percent` — список 10/20/50; меняются список и детали                                      |
| Catalog / Stock control          | `available` — boolean, `quantity` — строковое число; недоступные товары и восстановление остатков   |
| Catalog / Empty catalog          | Пустое состояние результатов                                                                        |
| Catalog / Catalog unavailable    | 503, параметризованное сообщение и повтор запроса                                                   |
| Catalog / Missing product detail | Каталог остаётся доступен, wildcard деталей возвращает 404                                          |
| Profile / Customer profile       | Имя в текстовом поле, роль в dropdown, VIP-профиль                                                  |
| Profile / Anonymous customer     | `json(null)`, гостевое состояние                                                                    |
| Network / Slow network           | Async modifier задерживает все demo API на 300/1500/3000 мс, сохраняя JSON, статус, текст и CSV     |
| Orders / Checkout failure        | Выбор 400/503 и сообщение об ошибке                                                                 |
| Orders / Checkout discount       | Изменение текущей суммы успешного заказа; ошибки сохраняются                                        |
| Orders / Shipping fee            | Добавление стоимости доставки; влияние порядка композиции                                           |
| Notice / Custom announcement     | Текстовый envelope и заголовок `X-QMock-Demo: override`                                             |
| Notice / Notice pass-through     | Patch `null` отключает мок, запрос идёт следующему middleware/proxy; без backend здесь получаем 404 |
| Contact / Newsletter unavailable | Ошибка 503 при отправке URL-encoded подписки, параметр сообщения                                    |

Оверрайды применяются сверху вниз. Для лампы за 4200 ₽ `Checkout discount` 20% → `Shipping fee` 500 даст **3860 ₽**. Обратный порядок даст **3760 ₽**. `Checkout failure` заменяет ответ полностью; modifiers скидки и доставки пропускают ответы без `total`. `Empty catalog` заменяет список, а скидка после него сохраняет пустой массив. `Notice pass-through` → `Custom announcement` снова создаёт ответ после отключения маршрута. `null` как patch означает pass-through, `json(null)` означает настоящий JSON-null ответ. Запрос notice отправляет `Accept: text/plain`, поэтому после pass-through без бэкенда получает 404. Запросы с `Accept: */*` могут получить HTML от Vite SPA fallback, это уже поведение следующего middleware.

Модификатор получает текущий JSON-body и `{ request, response }`. Возврат `undefined` сохраняет текущий ответ: так задержка не теряет binary/text payload. Новый envelope заменяет статус, заголовки и формат ответа. Общие функции находятся в `overrides/_helpers`; underscore исключает их из каталога.

## Сохранение и редактирование

Настройки **Active**, порядок, включение и параметры сохраняются в `.mock-overrides.json` и переживают перезапуск. Этот файл относится к личному окружению и исключён из Git. Моки и `.ts`-сценарии можно менять при работающем dev-сервере: QMock подхватит изменения на следующих запросах. Обновите каталог панели, если добавили новый сценарий. Группы и ID соответствуют путям файлов, например `catalog/discount.ts` → `catalog/discount`.

## Проверки без влияния на панель

Тесты используют те же handlers и импортированные оверрайды, что и dev-панель, но вычисляют ответы в памяти. `.mock-overrides.json` не читается. Адрес dev-сервера и заголовки scope больше не нужны.

| Команда                  | Что проверяет                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm run test:mocks`     | Vitest: базовые handlers, оверрайды, порядок, формы, текст, CSV и независимые scopes без сервера         |
| `npm run test:ui`        | Playwright: интерфейс на production-сборке, каталог, заказ, ошибки и независимые browser contexts        |
| `npm run test:dev-mocks` | Отдельная интеграционная проверка Vite-плагина и каталога панели на свободном порту с `stateFile: false` |

### Vitest

`@avinlab/qmock/vitest` перехватывает обычный `fetch` внутри `scope.run()`. Начальные handlers по умолчанию загружаются из `src/mocks/handlers.ts`. Дополнительные сценарии передаются импортами; порядок массива определяет порядок применения.

```ts
import { createMockScope } from "@avinlab/qmock/vitest";
import { expect, test } from "vitest";
import checkoutFailure from "../src/mocks/overrides/orders/failure";

const scope = await createMockScope({
  overrides: [{ override: checkoutFailure, params: { status: "503", message: "Offline" } }],
});
await scope.run(async () => {
  const response = await fetch("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: [{ productId: "lamp", quantity: 1 }],
      email: "demo@example.com",
    }),
    headers: { "Content-Type": "application/json" },
  });
  expect(response.status).toBe(503);
});
```

`run` завершает перехват и сбрасывает временные patches после callback, в том числе при исключении. Вся асинхронная работа приложения должна быть дождана внутри callback. Вложенные и параллельные scopes независимы, даже с одинаковым `name`. Для fixture с автоматическим созданием scope используйте `test.extend({ mocks: withMocks() })` и тип `VitestMockScope`; пример есть в `tests/mocks.test.ts`.

### Playwright

В `tests/catalog.spec.ts` используется `createMockTest(base)` из `@avinlab/qmock/playwright`. Он автоматически устанавливает routes на browser context до навигации, передаёт fixture `mockScope` и вызывает `dispose()` после каждого теста.

```ts
import { createMockTest } from "@avinlab/qmock/playwright";
import { test as base, expect } from "@playwright/test";
import emptyCatalog from "../src/mocks/overrides/catalog/empty";

const test = createMockTest(base, { overrides: [emptyCatalog] });
test("empty catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Пока ничего не нашлось")).toBeVisible();
});
```

Для ручного управления есть `applyMocks(context, options)` или `applyMocks(page, options)`; после теста вызывайте `dispose()` в `finally`. Пример независимых contexts есть в браузерных тестах. Адаптер перехватывает browser networking, включая абсолютные backend URL, но не `context.request` / `APIRequestContext`.

`playwright.config.ts` блокирует Service Workers (`serviceWorkers: "block"`), чтобы запросы дошли до routes. Тесты запускаются параллельно. `webServer` собирает приложение и запускает только статический `vite preview` на `127.0.0.1:4173`; Vite mock plugin в нём не работает. Это сервер файлов приложения, API-моки вычисляются локальным адаптером. Рабочий dev-сервер на порту 5173 не используется. Для первого запуска выполните `npx playwright install chromium`.

### Patches и сброс

Оба адаптера принимают `configuration` (объект или путь), `root`, `alias`, `overrides`, `name` и начальные `patches`. По умолчанию достаточно вызвать адаптер без options для базовых handlers. TS aliases загружаются из tsconfig; Vite-only aliases передавайте явно.

`set(patches)` заменяет временную карту patches, которые применяются после настроенных оверрайдов. `clear()` восстанавливает **начальные patches** и сохраняет **настроенные overrides**. Например, при scope с `Checkout failure` сброс не делает заказ успешным: ошибка из выбранного сценария продолжает действовать. Для другого сценария создайте отдельный scope или задайте временный patch. Методы `set` и `clear` синхронные; `createMockScope`, `run`, `applyMocks` и `dispose` асинхронные.

Поддерживаются функции, JSON, `json(null)`, text и binary envelopes. Patch `null` и неизвестные маршруты передают запрос обычному networking в адаптерах. Низкоуровневый `scope.handle(request)` вернёт `undefined` для pass-through, а `scope.fetch` предназначен для прямого запроса моков и бросает ошибку для немокированного маршрута.

Внутренний API панели (`GET/PUT /__apiMocks/overrides`) используется только в `scripts/qmock-smoke.mjs` для проверки dev-интеграции. При обновлении QMock этот внутренний интерфейс нужно перепроверить. Прикладные и браузерные тесты используют публичные адаптеры.
