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

    const db = client.db("travel-tree");
    const toursCollection = db.collection("tours");

    app.get('/api/tours', async (req, res) => {
      const cursor = toursCollection.find();
      const tours = await cursor.toArray();
      res.send({ success: true, data: tours });
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
