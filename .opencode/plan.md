# Travel Tree Backend — Implementation Plan

## Phase 1: Project Scaffolding

### 1.1 Initialize project & install deps
- [X] `npm init -y`
- [X] Install runtime deps: `express`, `mongodb`, `cors`, `dotenv`
- [X] Install dev deps: `typescript`, `@types/express`, `@types/cors`, `@types/node`, `ts-node`, `nodemon`
- [X] Add dev scripts to `package.json`

### 1.2 Create TypeScript config
- [X] Create `tsconfig.json` (target: ES2020, module: commonjs, rootDir: `.`, outDir: `./dist`, strict: true, esModuleInterop: true)

### 1.3 Create env & ignore files
- [X] `.env` with `PORT=5000` and `MONGODB_URI` placeholder
- [X] `.gitignore` — node_modules, dist, .env

### 1.4 Create .opencode files
- [X] `.opencode/plan.md` — this file
- [X] `.opencode/AGENTS.md` — conventions & notes

---

## Phase 2: Entry Point — DNS, Imports & App Setup

### 2.1 Create `index.ts` — DNS & imports
- [X] DNS fix: `import dns from "node:dns"; dns.setServers(['8.8.8.8', '8.8.4.4'])`
- [X] TypeScript imports: `express`, `cors`, `MongoClient`, `ServerApiVersion`, `ObjectId` from `mongodb`
- [X] Load `dotenv/config`

### 2.2 App initialization & middleware
- [X] Create Express app, define `port`
- [X] `app.use(cors())` with origin `http://localhost:3000`, credentials: true
- [X] `app.use(express.json())`
- [X] Root health-check route: `GET /` → `"Travel Tree server is running"`
- [X] `app.listen(port, ...)`

---

## Phase 3: MongoDB Connection

### 3.1 Configure MongoClient
- [X] Read `MONGODB_URI` from env
- [X] Create `MongoClient` with `ServerApiVersion.v1`, strict: true

### 3.2 Implement `run()` function
- [X] Define `async function run()`
- [X] `await client.connect()`
- [X] `const db = client.db("travel-tree")` (or from env)
- [X] `const toursCollection = db.collection("tours")`
- [X] Ping `admin` database to verify connection
- [X] Log success message on connection
- [X] `finally` block with `client.close()` commented
- [X] `run().catch(console.dir)`

### 3.3 Place all route handlers inside `run()`
- [X] All route handlers go **inside** `run()` after collection definition so they have access to `toursCollection`

---

## Phase 4: Read Endpoints

### 4.1 GET /api/tours — Fetch all tours
- [X] `app.get('/api/tours', ...)`
- [X] `toursCollection.find().toArray()`
- [X] Respond with `{ success: true, data: tours }`

### 4.2 GET /api/tours/:id — Fetch single tour
- [X] `app.get('/api/tours/:id', ...)`
- [X] Convert `req.params.id` to `ObjectId`
- [X] `toursCollection.findOne({ _id: new ObjectId(id) })`
- [X] 404 if not found: `{ success: false, message: "Tour not found" }`
- [X] 200 with data: `{ success: true, data: tour }`

---

## Phase 5: Write Endpoints

### 5.1 POST /api/tours — Create a tour
- [x] `app.post('/api/tours', ...)`
- [X] Inline validation: check required fields (title, shortDescription, fullDescription, price, location, category, duration, imageUrl)
- [X] 400 if missing: `{ success: false, message: "Missing required fields" }`
- [X] Auto-set `createdAt`, `updatedAt`
- [X] `toursCollection.insertOne(newTour)`
- [X] Set `rating` default to 0 if not provided
- [X] 201 response: `{ success: true, message: "Tour created successfully", data: createdTour }`

### 5.2 PATCH /api/tours/:id — Update a tour
- [x] `app.patch('/api/tours/:id', ...)`
- [x] Convert id to ObjectId
- [x] Build `$set` object from `req.body` (only provide fields that are sent)
- [x] Auto-update `updatedAt`
- [x] `toursCollection.updateOne(filter, { $set: updateData })`
- [x] Check `modifiedCount` — 404 if no document matched
- [x] Respond with updated document via `findOne`
- [x] Response: `{ success: true, message: "Tour updated successfully", data: tour }`

### 5.3 DELETE /api/tours/:id — Delete a tour
- [x] `app.delete('/api/tours/:id', ...)`
- [x] Convert id to ObjectId
- [x] `toursCollection.deleteOne({ _id: new ObjectId(id) })`
- [x] Check `deletedCount` — 404 if none deleted
- [x] Response: `{ success: true, message: "Tour deleted successfully" }`

### 5.4 GET /api/tours/stats/daily-creation — Daily tour creation stats
- [x] `app.get('/api/tours/stats/daily-creation', ...)`
- [x] Require `userId` query param (400 if missing)
- [x] Aggregation pipeline: `$match` by userId + last 7 days, `$group` by date, `$sort` ascending
- [x] Fill missing days with 0 count
- [x] Response: `{ success: true, data: [{ date: "2026-07-07", count: 3 }, ...] }`

---

## Phase 6: Error Handling & Response Consistency

### 6.1 Try/catch on all routes
- [x] Wrap every route handler in try/catch
- [x] Log errors server-side with `console.error`
- [x] Validation errors → 400
- [x] Server errors → 500: `{ success: false, message: "Internal server error" }`
- [x] ObjectId cast errors caught gracefully → 400

### 6.2 (Review) Verify all response shapes match PRD spec
- [x] Every response has `success` boolean
- [x] Success responses have `data` and optional `message`
- [x] Error responses have `message`

---

## Phase 7: Verification

### 7.1 Dev server smoke test
- [x] `npm run dev` starts without errors
- [x] Console logs "Pinged your deployment" on connect
- [x] `GET /` returns health check text

### 7.2 Build check
- [x] `npm run build` produces `dist/index.js` with no TS errors

### 7.3 Endpoint verification (curl or manual)
- [ ] Create a tour (POST) → 201
- [ ] Get all tours (GET) → 200 array
- [ ] Get single tour (GET /:id) → 200
- [ ] Get non-existent tour → 404
- [ ] Update tour (PATCH /:id) → 200
- [ ] Delete tour (DELETE /:id) → 200
