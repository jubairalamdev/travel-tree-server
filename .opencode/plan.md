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
- [ ] DNS fix: `require("node:dns").setServers(['8.8.8.8', '8.8.4.4'])`
- [ ] TypeScript imports: `express`, `cors`, `MongoClient`, `ServerApiVersion`, `ObjectId` from `mongodb`
- [ ] Load `dotenv/config`

### 2.2 App initialization & middleware
- [ ] Create Express app, define `port`
- [ ] `app.use(cors())` with origin `http://localhost:3000`, credentials: true
- [ ] `app.use(express.json())`
- [ ] Root health-check route: `GET /` → `"Travel Tree server is running"`
- [ ] `app.listen(port, ...)`

---

## Phase 3: MongoDB Connection

### 3.1 Configure MongoClient
- [ ] Read `MONGODB_URI` from env
- [ ] Create `MongoClient` with `ServerApiVersion.v1`, strict: true

### 3.2 Implement `run()` function
- [ ] Define `async function run()`
- [ ] `await client.connect()`
- [ ] `const db = client.db("travel_tree")` (or from env)
- [ ] `const toursCollection = db.collection("tours")`
- [ ] Ping `admin` database to verify connection
- [ ] Log success message on connection
- [ ] `finally` block with `client.close()` commented
- [ ] `run().catch(console.dir)`

### 3.3 Place all route handlers inside `run()`
- [ ] All route handlers go **inside** `run()` after collection definition so they have access to `toursCollection`

---

## Phase 4: Read Endpoints

### 4.1 GET /api/tours — Fetch all tours
- [ ] `app.get('/api/tours', ...)`
- [ ] `toursCollection.find().toArray()`
- [ ] Respond with `{ success: true, data: tours }`

### 4.2 GET /api/tours/:id — Fetch single tour
- [ ] `app.get('/api/tours/:id', ...)`
- [ ] Convert `req.params.id` to `ObjectId`
- [ ] `toursCollection.findOne({ _id: new ObjectId(id) })`
- [ ] 404 if not found: `{ success: false, message: "Tour not found" }`
- [ ] 200 with data: `{ success: true, data: tour }`

---

## Phase 5: Write Endpoints

### 5.1 POST /api/tours — Create a tour
- [ ] `app.post('/api/tours', ...)`
- [ ] Inline validation: check required fields (title, shortDescription, fullDescription, price, location, category, duration, imageUrl)
- [ ] 400 if missing: `{ success: false, message: "Missing required fields" }`
- [ ] Auto-set `createdAt`, `updatedAt`
- [ ] `toursCollection.insertOne(newTour)`
- [ ] Set `rating` default to 0 if not provided
- [ ] 201 response: `{ success: true, message: "Tour created successfully", data: createdTour }`

### 5.2 PATCH /api/tours/:id — Update a tour
- [ ] `app.patch('/api/tours/:id', ...)`
- [ ] Convert id to ObjectId
- [ ] Build `$set` object from `req.body` (only provide fields that are sent)
- [ ] Auto-update `updatedAt`
- [ ] `toursCollection.updateOne(filter, { $set: updateData })`
- [ ] Check `modifiedCount` — 404 if no document matched
- [ ] Respond with updated document via `findOne`
- [ ] Response: `{ success: true, message: "Tour updated successfully", data: tour }`

### 5.3 DELETE /api/tours/:id — Delete a tour
- [ ] `app.delete('/api/tours/:id', ...)`
- [ ] Convert id to ObjectId
- [ ] `toursCollection.deleteOne({ _id: new ObjectId(id) })`
- [ ] Check `deletedCount` — 404 if none deleted
- [ ] Response: `{ success: true, message: "Tour deleted successfully" }`

---

## Phase 6: Error Handling & Response Consistency

### 6.1 Try/catch on all routes
- [ ] Wrap every route handler in try/catch
- [ ] Log errors server-side with `console.error`
- [ ] Validation errors → 400
- [ ] Server errors → 500: `{ success: false, message: "Internal server error" }`
- [ ] ObjectId cast errors caught gracefully → 400

### 6.2 (Review) Verify all response shapes match PRD spec
- [ ] Every response has `success` boolean
- [ ] Success responses have `data` and optional `message`
- [ ] Error responses have `message`

---

## Phase 7: Verification

### 7.1 Dev server smoke test
- [ ] `npm run dev` starts without errors
- [ ] Console logs "Pinged your deployment" on connect
- [ ] `GET /` returns health check text

### 7.2 Build check
- [ ] `npm run build` produces `dist/index.js` with no TS errors

### 7.3 Endpoint verification (curl or manual)
- [ ] Create a tour (POST) → 201
- [ ] Get all tours (GET) → 200 array
- [ ] Get single tour (GET /:id) → 200
- [ ] Get non-existent tour → 404
- [ ] Update tour (PATCH /:id) → 200
- [ ] Delete tour (DELETE /:id) → 200
