const express = require("express");
const router = express.Router();
const { 
  getAllSkpd, 
  searchSkpd, 
  getSkpdById, 
  getSkpdByStatus 
} = require("../controllers/skpdController");


module.exports = router; 