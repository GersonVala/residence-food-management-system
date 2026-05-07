# Frontend Testing

## Running tests

| Command | When to use |
|---------|-------------|
| `npm test` | Local development — starts Vitest in watch mode |
| `npm run test:run` | CI / one-shot pass/fail (no watch) |
| `npm run test:ui` | Visual browser UI for exploring tests |
| `npm run test:coverage` | Generate coverage report (v8 provider) |

> **CI note**: always use `test:run` in pipelines. The default `npm test` starts watch mode and will hang in a non-TTY environment.

## Co-location convention

Tests live next to the source file they cover:

```
src/
  modules/
    auth/
      auth.utils.ts
      auth.utils.test.ts       <- unit tests for auth.utils
      pages/
        LoginPage.tsx
        LoginPage.test.tsx     <- component tests for LoginPage
  test/
    setup.ts                   <- global setup (jest-dom + cleanup)
```

Rule: if you move a module, move its test file with it.

## Mock patterns

### API module (`@/lib/api`)

```ts
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
```

Cast the mock for type-safe control in tests:

```ts
import { api } from '@/lib/api'
const apiPost = api.post as ReturnType<typeof vi.fn>
apiPost.mockResolvedValueOnce({ ... })
```

### React Router (`react-router-dom`)

Partial mock — keep `Navigate`, `MemoryRouter`, etc. real, only stub `useNavigate`:

```ts
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
```

Wrap component renders in `<MemoryRouter>` to satisfy router context.

### Fake timers (JWT expiry)

```ts
vi.useFakeTimers()
vi.setSystemTime(1_700_000_000_000) // fixed ms epoch

// restore in afterEach
vi.useRealTimers()
```

`isAuthenticated` calls `Date.now()` directly — fake timers make expiry tests deterministic.

## Globals

`describe`, `it`, `test`, `expect`, `vi`, `beforeEach`, `afterEach` are available without imports (configured via `globals: true` in `vite.config.ts`). Explicit imports are also fine.

## jest-dom matchers

Extended matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveValue`, etc.) are loaded globally from `src/test/setup.ts`. No import needed in test files.
