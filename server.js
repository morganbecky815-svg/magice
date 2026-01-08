// MAGIC EDEN BACKEND - COMPLETE WORKING VERSION
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log("✅ Connected to MongoDB");
})
.catch(err => {
  console.error("❌ MongoDB Error:", err.message);
});

// ========== API ROUTES ==========

// Test API
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Magic Eden API is working!",
    timestamp: new Date().toISOString()
  });
});

// NFT Data API
app.get("/api/nft", (req, res) => {
  res.json({
    success: true,
    nfts: [
      {
        _id: "1",
        name: "Cosmic Explorer #1",
        price: 0.45,
        image: "https://via.placeholder.com/300x200/6c63ff/ffffff?text=Cosmic+Explorer",
        collectionName: "Space Voyagers",
        owner: { email: "admin@magiceden.com", fullName: "Admin" }
      },
      {
        _id: "2",
        name: "Pixel Punk #123",
        price: 1.25,
        image: "https://via.placeholder.com/300x200/ff6b6b/ffffff?text=Pixel+Punk",
        collectionName: "Crypto Punks",
        owner: { email: "admin@magiceden.com", fullName: "Admin" }
      },
      {
        _id: "3",
        name: "Dragon Warrior",
        price: 0.89,
        image: "https://via.placeholder.com/300x200/4CAF50/ffffff?text=Dragon+Warrior",
        collectionName: "Game Legends",
        owner: { email: "admin@magiceden.com", fullName: "Admin" }
      },
      {
        _id: "4",
        name: "Digital Dreamscape",
        price: 0.75,
        image: "https://via.placeholder.com/300x200/FF9800/ffffff?text=Digital+Art",
        collectionName: "Abstract Art",
        owner: { email: "admin@magiceden.com", fullName: "Admin" }
      }
    ]
  });
});

// ========== HTML PAGE ROUTES ==========

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

// Register Page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

// Dashboard Page
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});

// Profile Page
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "views/profile.html"));
});

// Create NFT Page
app.get("/create-nft", (req, res) => {
  res.sendFile(path.join(__dirname, "views/create-nft.html"));
});

// Add ETH Page
app.get("/add-eth", (req, res) => {
  res.sendFile(path.join(__dirname, "views/add-eth.html"));
});

// ========== ALL PAGE ROUTES ==========
const pages = [
  "/", "/login", "/register", "/dashboard", "/profile",
  "/add-eth", "/create-nft", "/convert-weth", "/verify", "/admin"
];

pages.forEach(page => {
  app.get(page, (req, res) => {
    const fileName = page === "/" ? "index.html" : page.slice(1) + ".html";
    res.sendFile(path.join(__dirname, "views", fileName));
  });
});
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
});