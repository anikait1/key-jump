
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Code Style

### Naming Conventions
Use PascalCase for constant objects, not SCREAMING_SNAKE_CASE:
```ts
// Good
const StorageKeys = { siteConfigs: "siteConfigs" } as const;

// Bad
const STORAGE_KEYS = { siteConfigs: "siteConfigs" } as const;
```

### Avoid Premature Abstraction
Don't create functions unless the logic is reused elsewhere. Long, focused functions are acceptable.

Example from codebase (`src/content.ts:307`):
```ts
function handleKeydown(event: KeyboardEvent): void {
  // All keydown logic in one place - input check, state dispatch
}
```

### Minimize State
Keep state minimal. Use discriminated unions for optional states.

Example from codebase (`src/content.ts:40-42`):
```ts
type InactiveHintState = { status: "inactive" };
type HintStateType = ActiveHintState | InactiveHintState;
// Inactive state is minimal; active state only created when needed
```

### Avoid `as` Type Casts
Prefer generics or type guards over `as` casts. They provide better type safety.

```ts
// Good
const el = document.querySelector<HTMLInputElement>("#my-input")!;

// Bad
const el = document.getElementById("my-input") as HTMLInputElement;
```

### Reduce Exceptional Cases
Write code so generic and edge cases use the same logic path, avoiding early exits or separate branches.

Example from codebase (`src/content.ts:68-85`):
```ts
// Single loop handles any count - small or large - without special cases
for (let i = 0; labels.length < count; i++) {
  // ... generates next label
}
// Works for 5 elements or 5000 without branching logic
```

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
