
const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

const readingController = require("../controllers/readingController");

// Protect all reading endpoints
router.use(authenticateUser);

// Reading CRUD routes
router.post("/", readingController.createReading);
router.get("/", readingController.getReadings);
router.put("/:id", readingController.updateReading);
router.delete("/:id", readingController.deleteReading);

module.exports = router;
