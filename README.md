# Little things — QMock demo

Vite + React + TypeScript + Redux Toolkit + RTK Query + shadcn/ui.

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm run build
npm run lint
npm run test:mocks
npm run test:ui
npm run test:dev-mocks
```

Redux store: `src/app/store.ts`. Typed hooks: `src/app/hooks.ts`.
RTK Query API: `src/services/api.ts` (base URL `/api`).

Add UI components with `npx shadcn@latest add <component>`.

QMock 0.1.1 is installed from npm as a development dependency.
The mock dashboard is available at `/__apiMocks` while Vite is running.
Handlers are configured in `src/mocks/handlers.ts`.

Откройте магазин на `http://localhost:5173`, затем нажмите «Сценарии QMock».
Активируйте сценарии в панели и нажмите «Обновить данные» в магазине,
чтобы повторно выполнить запросы и увидеть результат.

Подробная инструкция, примеры композиции сценариев и изолированных тестов:
[docs/QMOCK.md](docs/QMOCK.md).

Моки работают только в `npm run dev`. Для production сборки нужен настоящий API.

`test:mocks` использует Vitest и `@avinlab/qmock/vitest` без сервера моков.
`test:ui` проверяет production-сборку через `vite preview` на порту 4173;
API-запросы перехватывает `@avinlab/qmock/playwright` независимо от dev-панели.
Проверяются каталог, оформление заказа, ошибки, повторный запрос и изоляция сценариев.
`test:dev-mocks` отдельно проверяет Vite-плагин и каталог оверрайдов панели.
Для первого запуска браузерных тестов выполните `npx playwright install chromium`.
