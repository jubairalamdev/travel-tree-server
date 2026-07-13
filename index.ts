import dns from "node:dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI as string;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("travel_tree");
    const toursCollection = db.collection("tours");

    app.get('/api/tours', async (req, res) => {
      const cursor = toursCollection.find();
      const tours = await cursor.toArray();
      res.send({ success: true, data: tours });
    });

    app.post('/api/tours', async (req, res) => {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (req.body.originalPrice !== undefined) {
        newTour.originalPrice = req.body.originalPrice;
      }

      if (req.body.createdBy) {
        newTour.createdBy = req.body.createdBy;
      }

      const result = await toursCollection.insertOne(newTour);
      const createdTour = await toursCollection.findOne({ _id: result.insertedId });
      res.status(201).send({ success: true, message: "Tour created successfully", data: createdTour });
    });

    app.get('/api/tours/stats/daily-creation', async (req, res) => {
      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).send({ success: false, message: "userId query parameter is required" });
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const startDate = sevenDaysAgo.toISOString();

      const pipeline = [
        { $match: { createdBy: userId, createdAt: { $gte: startDate } } },
        { $group: { _id: { $substr: ['$createdAt', 0, 10] }, count: { $sum: 1 } } },
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
    });

    app.get('/api/tours/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const tour = await toursCollection.findOne(query);
      if (!tour) {
        res.status(404).send({ success: false, message: "Tour not found" });
        return;
      }
      res.send({ success: true, data: tour });
    });

    app.patch('/api/tours/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

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
    });

    app.delete('/api/tours/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await toursCollection.deleteOne(filter);

      if (result.deletedCount === 0) {
        res.status(404).send({ success: false, message: "Tour not found" });
        return;
      }

      res.send({ success: true, message: "Tour deleted successfully" });
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Travel Tree server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
