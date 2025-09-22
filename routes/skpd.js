const express = require("express");
const router = express.Router();
const { 
  getAllSkpd, 
  getSkpdById, 
  getSkpdByStatus 
} = require("../controllers/skpdController");


module.exports = router; 