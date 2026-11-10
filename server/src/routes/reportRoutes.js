const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

const reportController = require("../controllers/reportController");

// Protect all report endpoints
router.use(authenticateUser);

// Report routes
router.get("/daily", reportController.getDailyReport);

router.get("/month-to-date", reportController.getMonthToDateReport);

router.get("/previous-month", reportController.getPreviousMonthReport);

module.exports = router;