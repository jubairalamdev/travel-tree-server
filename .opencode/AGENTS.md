# Travel Tree Backend — Agent Guide

## Project Style

- Single-file Express server: `index.ts` (no MVC, no routers, no controllers)
- Follow the JS guide pattern: DNS fix → `run()` function → routes inside `run()` → ping → middleware + listen after
- No Mongoose — use native `mongodb` driver with `ServerApiVersion.v1`
- Consistent response format: `{ success: boolean, message?: string, data?: any }`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon + ts-node |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled JS from `dist/` |

## Conventions

- Use `import` syntax with `esModuleInterop`
- Use `async/await` consistently
- DNS fix: `import dns from "node:dns"; dns.setServers(['8.8.8.8', '8.8.4.4'])` at the very top
- MongoDB connection in `async function run() { ... }` with try/catch
- Ping admin DB: `await client.db("admin").command({ ping: 1 })`
- `run().catch(console.dir)` at module level
- Routes defined **inside** `run()` after collection is initialized
- CORS: origin `http://localhost:3000`, credentials: true
- Use PATCH (not PUT) for updates
- Wrap each route handler in try/catch
- Validation errors → 400, server errors → 500
- ObjectId errors caught gracefully

## Commit Convention

```
feat: add GET /api/tours endpoint
chore: initialize project with npm and deps
fix: handle ObjectId cast error in GET /api/tours/:id
```

## Database

- Database name: `travel-tree`
- Collection: `tours`
- Required tour fields: title, shortDescription, fullDescription, price, location, category, duration, imageUrl
