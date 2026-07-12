# Backend Product Requirements Document

# Travel Tree Backend API

**Version:** 1.0
**Status:** Final
**Project:** Travel Tree
**Backend:** Node.js + Express.js + TypeScript + MongoDB Atlas

---

# 1. Project Overview

## Objective

Travel Tree Backend API is a RESTful backend service responsible for managing tours and application data for the Travel Tree platform.

The backend is a single-file Express server (`index.ts`) with no MVC structure, no authentication layer (JWT will be added manually later), and uses MongoDB Atlas with the native `mongodb` driver.

The API should be:
- Simple and minimal
- Type-safe (TypeScript)
- CORS-enabled for frontend access
- Production-ready

---

# 2. Technology Stack

| Layer | Technology |
|---------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB Atlas |
| Driver | mongodb (native driver) |
| Environment | dotenv |
| API Style | REST |

---

# 3. Project Structure

```
travel-tree-backend/
├── index.ts          # Everything: app setup, DB connection, routes
├── .env
├── tsconfig.json
├── package.json
└── .gitignore
```

Everything lives in a single `index.ts` file:
- Express app creation
- CORS and JSON body parser
- MongoDB client connection with connection pooling
- Tour type/interface definition
- All route handlers (no routers, no controllers)
- Server startup

---

# 4. MongoDB Connection

Use the native `mongodb` driver (not Mongoose).

Connection logic:
- Read `MONGODB_URI` from `.env`
- Create a `MongoClient` with connection pooling
- Use database name `travel-tree` (or from env)
- Log connection success/failure
- Export the client and db instances for route use

No Mongoose, no ODM — just raw collection operations.

---

# 5. Collections

## 5.1 Tours

| Field | Type | Required |
|---------|------|----------|
| title | string | Yes |
| shortDescription | string | Yes |
| fullDescription | string | Yes |
| price | number | Yes |
| originalPrice | number | No |
| location | string | Yes |
| category | string | Yes |
| duration | string | Yes |
| rating | number | No (default 0) |
| imageUrl | string | Yes |
| createdBy | string | No (for future JWT use) |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

---

# 6. TypeScript Interface

```ts
interface Tour {
  _id?: ObjectId;
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  originalPrice?: number;
  location: string;
  category: string;
  duration: string;
  rating: number;
  imageUrl: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

# 7. API Routes

Dev PORT: `/5000`
Base URL: `/api`

## Tours

### GET /api/tours

Returns all tours.

Response:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /api/tours/:id

Returns a single tour by `_id`.

Response:
```json
{
  "success": true,
  "data": { ... }
}
```

Error (not found):
```json
{
  "success": false,
  "message": "Tour not found"
}
```

---

### POST /api/tours

Create a new tour.

Request body:
```json
{
  "title": "string",
  "shortDescription": "string",
  "fullDescription": "string",
  "price": 0,
  "originalPrice": 0,
  "location": "string",
  "category": "string",
  "duration": "string",
  "rating": 0,
  "imageUrl": "string"
}
```

Inline validation: check required fields, return 400 if missing.

Response:
```json
{
  "success": true,
  "message": "Tour created successfully",
  "data": { ... }
}
```

---

### PUT /api/tours/:id

Update a tour by `_id`.

Request body: partial tour fields.

Response:
```json
{
  "success": true,
  "message": "Tour updated successfully",
  "data": { ... }
}
```

---

### DELETE /api/tours/:id

Delete a tour by `_id`.

Response:
```json
{
  "success": true,
  "message": "Tour deleted successfully"
}
```

---

# 8. Response Format

## Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

## Error
```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

# 9. Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/travel-tree
```

No auth-related env vars.

---

# 10. CORS

CORS should be enabled with:
- Origin: `http://localhost:3000` (frontend dev server)
- Methods: GET, POST, PUT, DELETE
- Credentials: true (for future cookie/JWT support)

---

# 11. Error Handling

Wrap all route handlers in try/catch. On error:
- Log the error server-side
- Return 500 with `{ success: false, message: "Internal server error" }`
- Validation errors return 400 with descriptive message

---

# 12. Dependencies

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "mongodb": "^6.9.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.14.0",
    "ts-node": "^10.9.2",
    "nodemon": "^3.1.4"
  }
}
```

---

# 13. tsconfig.json

Standard Node.js TypeScript config:
- `target`: ES2020
- `module`: commonjs
- `outDir`: ./dist
- `rootDir`: ./src
- `strict`: true
- `esModuleInterop`: true

---

# 14. Development Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

# 15. Future Improvements

Things to add later (not in initial build):
- JWT authentication (manual setup)
- Search tours by title/location
- Pagination, filtering, sorting
- Favorites / wishlist
- Booking system
- Reviews and ratings
- Image upload (Cloudinary)
- Admin role management

---

# 16. Development Guidelines

- Use TypeScript everywhere.
- Keep everything in `index.ts` (single file simplicity).
- Validate request bodies inline with simple checks.
- Use async/await consistently.
- Return consistent JSON response format.
- Use meaningful HTTP status codes.
- Never expose sensitive information.
- Keep `createdBy` field as a string placeholder for future JWT.

---

# 17. Project Summary

Travel Tree Backend API is a minimal, single-file Express + TypeScript server backed by MongoDB Atlas. It provides simple CRUD operations for tours with no authentication layer, designed for easy setup and future expansion. JWT auth will be added manually at the end of development.

**Total estimated lines of `index.ts`:** ~150-200 lines.
