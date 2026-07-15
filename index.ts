import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const uri = process.env.MONGODB_URI as string;

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Lazy MongoDB connection — cached across Vercel warm invocations
let cachedClient: MongoClient | null = null;

async function getDb() {
  if (cachedClient) return cachedClient.db("travel_tree");

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected to MongoDB");
  cachedClient = client;
  return client.db("travel_tree");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw { status: 400, message: "Invalid tour ID format" };
  }
}

interface AuthRequest extends express.Request {
  userId?: string;
}

// Middleware: verify HMAC-signed auth token
async function verifyToken(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send({ success: false, message: "No token provided" });
      return;
    }

    const signedToken = authHeader.split(' ')[1];
    const parts = signedToken.split('.');
    if (parts.length !== 2) {
      res.status(403).send({ success: false, message: "Invalid token format" });
      return;
    }

    const rawToken = parts[0];
    const signature = parts[1];
    const expectedSig = crypto.createHmac('sha256', process.env.BETTER_AUTH_SECRET || '').update(rawToken).digest('base64url');

    if (expectedSig !== signature) {
      res.status(403).send({ success: false, message: "Invalid token signature" });
      return;
    }

    const db = await getDb();
    const session = await db.collection("session").findOne({ token: rawToken });
    if (!session) {
      res.status(403).send({ success: false, message: "Invalid session" });
      return;
    }

    const user = await db.collection("user").findOne({ _id: new ObjectId(session.userId) });
    if (!user) {
      res.status(403).send({ success: false, message: "User not found" });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).send({ success: false, message: "Authentication failed" });
  }
}

// Wrap route handlers with DB connection
function withDb(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      await getDb();
      await handler(req, res);
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).send({ success: false, message: err.message });
        return;
      }
      console.error("Error:", err);
      res.status(500).send({ success: false, message: "Internal server error" });
    }
  };
}

// Routes

app.get('/', (req, res) => {
  res.send('Travel Tree server is running');
});

app.get('/tours', withDb(async (req, res) => {
  const db = await getDb();
  const tours = await db.collection("tours").find().toArray();
  res.send({ success: true, data: tours });
}));

app.get('/tours/stats/daily-creation', withDb(async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).send({ success: false, message: "userId query parameter is required" });
    return;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const startDate = sevenDaysAgo.toISOString();

  const db = await getDb();
  const pipeline = [
    { $match: { createdBy: userId, createdAt: { $gte: startDate } } },
    { $group: { _id: { $substr: ['$createdAt', 0, 10] }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];

  const results = await db.collection("tours").aggregate(pipeline).toArray();

  const dateMap: Record<string, number> = {};
  for (const r of results) {
    dateMap[r._id] = r.count;
  }

  const data: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    data.push({ date: key, count: dateMap[key] || 0 });
  }

  res.send({ success: true, data });
}));

app.get('/tours/:id', withDb(async (req, res) => {
  const id = req.params.id as string;
  const query = { _id: toObjectId(id) };
  const db = await getDb();
  const tour = await db.collection("tours").findOne(query);
  if (!tour) {
    res.status(404).send({ success: false, message: "Tour not found" });
    return;
  }
  res.send({ success: true, data: tour });
}));

app.post('/tours', verifyToken, withDb(async (req, res) => {
  const { title, shortDescription, fullDescription, price, location, category, duration, imageUrl } = req.body;

  if (!title || !shortDescription || !fullDescription || !price || !location || !category || !duration || !imageUrl) {
    res.status(400).send({ success: false, message: "Missing required fields" });
    return;
  }

  const newTour: any = {
    title,
    shortDescription,
    fullDescription,
    price,
    location,
    category,
    duration,
    imageUrl,
    rating: req.body.rating || 0,
    createdBy: (req as AuthRequest).userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (req.body.originalPrice !== undefined) {
    newTour.originalPrice = req.body.originalPrice;
  }

  const db = await getDb();
  const result = await db.collection("tours").insertOne(newTour);
  const createdTour = await db.collection("tours").findOne({ _id: result.insertedId });
  res.status(201).send({ success: true, message: "Tour created successfully", data: createdTour });
}));

app.patch('/tours/:id', verifyToken, withDb(async (req, res) => {
  const id = req.params.id as string;
  const filter = { _id: toObjectId(id) };

  const updateData: Record<string, any> = {};
  const allowedFields = ['title', 'shortDescription', 'fullDescription', 'price', 'originalPrice', 'location', 'category', 'duration', 'rating', 'imageUrl'];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).send({ success: false, message: "No valid fields to update" });
    return;
  }

  updateData.updatedAt = new Date().toISOString();

  const db = await getDb();
  const result = await db.collection("tours").updateOne(filter, { $set: updateData });

  if (result.matchedCount === 0) {
    res.status(404).send({ success: false, message: "Tour not found" });
    return;
  }

  const updatedTour = await db.collection("tours").findOne(filter);
  res.send({ success: true, message: "Tour updated successfully", data: updatedTour });
}));

app.delete('/tours/:id', verifyToken, withDb(async (req, res) => {
  const id = req.params.id as string;
  const filter = { _id: toObjectId(id) };

  const db = await getDb();
  const result = await db.collection("tours").deleteOne(filter);

  if (result.deletedCount === 0) {
    res.status(404).send({ success: false, message: "Tour not found" });
    return;
  }

  res.send({ success: true, message: "Tour deleted successfully" });
}));

// Start server only when not in Vercel serverless context
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;
