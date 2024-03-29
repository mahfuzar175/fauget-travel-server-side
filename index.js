const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// ddddddddddd

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ktpzdpn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("travelDB").collection("users");
    const packagesCollection = client
      .db("travelDB")
      .collection("travelPackages");
    const storyCollection = client.db("travelDB").collection("stories");
    const cartCollection = client.db("travelDB").collection("carts");
    const bookingCollection = client.db("travelDB").collection("bookings");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // user verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };


    // user verify tourGuide after verify token
    const verifyTourGuide = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isTourGuide = user?.role === "tourGuide";
      if (!isTourGuide) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };


    // users related apis
    // admin role
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });



    // tour guide role
    app.get("/users/tourGuide/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let tourGuide = false;
      if (user) {
        tourGuide = user?.role === "tourGuide";
      }
      res.send({ tourGuide });
    });

    // users related apis
    // app.get("/users", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email: email };
    //   const result = await userCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.get("/users", async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // make admin
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // make tourguide
    app.patch("/users/tourGuide/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "tourGuide",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // packages apis
    app.get("/travelPackages", async (req, res) => {
      const result = await packagesCollection.find().toArray();
      res.send(result);
    });


   app.post("/travelPackages", async (req, res) => {
    const newPackage = req.body;
    const result = await packagesCollection.insertOne(newPackage);
    res.send(result);
    });

    // stories apis
    app.get("/stories", async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });

    app.post("/stories", async (req, res) => {
      const newStory = req.body;
      const result = await storyCollection.insertOne(newStory);
      res.send(result);
      });

    // cart related apps
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // booking
    app.post("/bookings", async (req, res) => {
      const bookingItem = req.body;
      const result = await bookingCollection.insertOne(bookingItem);
      res.send(result);
    });


    app.get("/bookings", async (req, res) => {
      const tourGuide = req.query.tourGuide;
      const email = req.query.email;
      const query = {};
      if(tourGuide){
        query.tourGuide = tourGuide;
      }
      if(email){
        query.email = email;
      }
      // const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });


  


    // app.get("/bookings", async (req, res) => {
    //   const result = await bookingCollection.find().toArray();
    //   res.send(result);
    // });



    // forReview
   app.patch("/bookings/inReview/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "inReview",
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // forRecjected
   app.patch("/bookings/rejected/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "rejected",
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // forReview
   app.patch("/bookings/accepted/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "accepted",
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("travel is running");
});

app.listen(port, () => {
  console.log(`travel is running on port ${port}`);
});
