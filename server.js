// MAGIC EDEN NFT MARKETPLACE - WORKING SERVER
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const authRoutes = require('./routes/auth');
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Connect to MongoDB
console.log("🔗 Connecting to MongoDB...");
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/magic-eden")
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });

// ========== API ROUTES ==========

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Magic Eden API is working!",
    timestamp: new Date().toISOString()
  });
});

// NFT data
app.get("/api/nft", (req, res) => {
  res.json({
    success: true,
    nfts: [
      {
        id: 1,
        name: "Cosmic Explorer",
        price: 0.45,
        image: "https://via.placeholder.com/300x200/6c63ff/ffffff"
      },
      {
        id: 2,
        name: "Pixel Punk",
        price: 1.25,
        image: "https://via.placeholder.com/300x200/ff6b6b/ffffff"
      }
    ]
  });
});

// ========== PAGE ROUTES ==========

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Auth pages
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

// User pages
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "views/profile.html"));
});

app.get("/add-eth", (req, res) => {
  res.sendFile(path.join(__dirname, "views/add-eth.html"));
});

app.get("/create-nft", (req, res) => {
  res.sendFile(path.join(__dirname, "views/create-nft.html"));
});

app.get("/convert-weth", (req, res) => {
  res.sendFile(path.join(__dirname, "views/convert-weth.html"));
});

app.use('/api/auth', authRoutes);

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
  console.log(`📁 Available pages:`);
  console.log(`   http://localhost:${PORT}/login`);
  console.log(`   http://localhost:${PORT}/register`);
  console.log(`   http://localhost:${PORT}/dashboard`);
  console.log(`   http://localhost:${PORT}/profile`);
});