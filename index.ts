import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

interface AuthRequest extends express.Request {
  userId?: string;
}

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

const uri = process.env.MONGODB_URI as string;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw { status: 400, message: "Invalid tour ID format" };
  }
}

async function run() {
  try {
    await client.connect();

    const db = client.db("travel_tree");
    const toursCollection = db.collection("tours");
    const sessionsCollection = db.collection("session");
    const usersCollection = db.collection("user");

    async function verifyToken(req: AuthRequest, res: any, next: any) {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).send({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(' ')[1];
        const session = await sessionsCollection.findOne({ token });

        if (!session) {
          return res.status(403).send({ success: false, message: "Invalid session" });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) });
        if (!user) {
          return res.status(403).send({ success: false, message: "User not found" });
        }

        req.userId = session.userId;
        next();
      } catch (err) {
        console.error("Auth error:", err);
        return res.status(500).send({ success: false, message: "Authentication failed" });
      }
    }

    app.get('/api/tours', async (req, res) => {
      try {
        const cursor = toursCollection.find();
        const tours = await cursor.toArray();
        res.send({ success: true, data: tours });
      } catch (err) {
        console.error("Error fetching tours:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    app.post('/api/tours', verifyToken, async (req, res) => {
      try {
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

        const result = await toursCollection.insertOne(newTour);
        const createdTour = await toursCollection.findOne({ _id: result.insertedId });
        res.status(201).send({ success: true, message: "Tour created successfully", data: createdTour });
      } catch (err) {
        console.error("Error creating tour:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    app.get('/api/tours/stats/daily-creation', verifyToken, async (req, res) => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const startDate = sevenDaysAgo.toISOString();

        const pipeline = [
          { $match: { createdBy: (req as AuthRequest).userId, createdAt: { $gte: startDate } } },
          { $group: { _id: { $substrCP: ['$createdAt', 0, 10] }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ];

        const results = await toursCollection.aggregate(pipeline).toArray();

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
      } catch (err) {
        console.error("Error fetching daily creation stats:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    app.get('/api/tours/:id', async (req, res) => {
      try {
        const id = req.params.id as string;
        const query = { _id: toObjectId(id) };
        const tour = await toursCollection.findOne(query);
        if (!tour) {
          res.status(404).send({ success: false, message: "Tour not found" });
          return;
        }
        res.send({ success: true, data: tour });
      } catch (err: any) {
        if (err.status === 400) {
          res.status(400).send({ success: false, message: err.message });
          return;
        }
        console.error("Error fetching tour:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    app.patch('/api/tours/:id', verifyToken, async (req, res) => {
      try {
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

        const result = await toursCollection.updateOne(filter, { $set: updateData });

        if (result.matchedCount === 0) {
          res.status(404).send({ success: false, message: "Tour not found" });
          return;
        }

        const updatedTour = await toursCollection.findOne(filter);
        res.send({ success: true, message: "Tour updated successfully", data: updatedTour });
      } catch (err: any) {
        if (err.status === 400) {
          res.status(400).send({ success: false, message: err.message });
          return;
        }
        console.error("Error updating tour:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    app.delete('/api/tours/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id as string;
        const filter = { _id: toObjectId(id) };

        const result = await toursCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
          res.status(404).send({ success: false, message: "Tour not found" });
          return;
        }

        res.send({ success: true, message: "Tour deleted successfully" });
      } catch (err: any) {
        if (err.status === 400) {
          res.status(400).send({ success: false, message: err.message });
          return;
        }
        console.error("Error deleting tour:", err);
        res.status(500).send({ success: false, message: "Internal server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Travel Tree server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});