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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (req.body.originalPrice !== undefined) {
        newTour.originalPrice = req.body.originalPrice;
      }

      const result = await toursCollection.insertOne(newTour);
      const createdTour = await toursCollection.findOne({ _id: result.insertedId });
      res.status(201).send({ success: true, message: "Tour created successfully", data: createdTour });
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
