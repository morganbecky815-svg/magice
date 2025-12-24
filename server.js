// MAGIC EDEN BACKEND - SIMPLE VERSION
const express = require("express");
const cors = require("cors");
const path = require("path");
// require('dotenv').config();
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const mongoose = require("mongoose");

dotenv.config();

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// connecting to mongo database
const db = mongoose
  .connect(process.env.DATABASE_URL, {})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Health check route
app.get("/", (req, res) => {
  // res.json({
  //   success: true,
  //   message: "Magic Eden Backend API",
  //   version: "1.0.0",
  // });
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/index.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.use(authRoutes);

app.get("/admin", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/admin.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/dashboard", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/dashboard.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/profile", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/profile.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/register", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/register.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/login", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/login.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/verify", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/verify.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/add-eth", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/add-eth.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/convert-weth", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/convert-weth.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

app.get("/create-nft", (req, res) => {
  try {
    res.status(200).sendFile(path.join(__dirname, "/views/create-nft.html"));
  } catch {
    res.status(404).send("page not found");
  }
});

// NFT example endpoint
app.get("/api/nfts", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "NFT #1", price: "1 SOL" },
      { id: 2, name: "NFT #2", price: "2 SOL" },
    ],
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Magic Eden Backend running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});
