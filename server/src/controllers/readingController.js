
const pool = require("../config/db");

const VALID_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner"
];

// VALIDATE READING INPUT
const validateReading = (reading_date, time_slot, value) => {
  if (
    !reading_date ||
    !time_slot ||
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Date, time slot and glucose value are required.";
  }

  // Validate date format
  if (
    typeof reading_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)
  ) {
    return "Please enter a valid date.";
  }

  // Validate actual calendar date
  const [year, month, day] = reading_date.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return "Please enter a valid date.";
  }

  // Get today's date in local timezone
  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  if (reading_date > today) {
    return "Date cannot be in the future.";
  }

  // Validate time slot
  if (!VALID_SLOTS.includes(time_slot)) {
    return "Please select a valid time slot.";
  }

  // Validate whole number
  if (!Number.isInteger(Number(value))) {
    return "Value must be a whole number between 40 and 600 mg/dl.";
  }

  // Validate glucose range
  if (Number(value) < 40 || Number(value) > 600) {
    return "Value must be between 40 and 600 mg/dl.";
  }

  return null;
};

// CREATE READING
const createReading = async (req, res) => {
  try {
    const { reading_date, time_slot, value } = req.body;

    const validationError = validateReading(
      reading_date,
      time_slot,
      value
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Check duplicate slot
    const existing = await pool.query(
      `SELECT id FROM readings
       WHERE user_id = $1
       AND reading_date = $2
       AND time_slot = $3`,
      [req.user.id, reading_date, time_slot]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have an ${time_slot} reading for this date.`
      });
    }

    // Check daily reading limit
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM readings
       WHERE user_id = $1
       AND reading_date = $2`,
      [req.user.id, reading_date]
    );

    if (count.rows[0].total >= 4) {
      return res.status(400).json({
        success: false,
        message: "You can add only 4 readings per day."
      });
    }

    // Insert reading
    const result = await pool.query(
      `INSERT INTO readings
       (user_id, reading_date, time_slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                 time_slot,
                 value,
                 created_at,
                 updated_at`,
      [req.user.id, reading_date, time_slot, Number(value)]
    );

    return res.status(201).json({
      success: true,
      message: "Glucose reading added successfully.",
      reading: result.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A reading already exists for this time slot and date."
      });
    }

    console.error("Create reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add glucose reading."
    });
  }
};

// GET ALL READINGS
const getReadings = async (req, res) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT
        id,
        TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
        time_slot,
        value,
        created_at,
        updated_at
      FROM readings
      WHERE user_id = $1
    `;

    const params = [req.user.id];

    if (date) {
      query += " AND reading_date = $2";
      params.push(date);
    }

    query += `
      ORDER BY reading_date DESC,
      CASE time_slot
        WHEN 'Morning' THEN 1
        WHEN 'After breakfast' THEN 2
        WHEN 'After lunch' THEN 3
        WHEN 'After dinner' THEN 4
      END
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      readings: result.rows
    });

  } catch (error) {
    console.error("Get readings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve readings."
    });
  }
};

// UPDATE READING
const updateReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { reading_date, time_slot, value } = req.body;

    const validationError = validateReading(
      reading_date,
      time_slot,
      value
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Check reading ownership
    const existing = await pool.query(
      `SELECT id FROM readings
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found."
      });
    }

    // Check duplicate slot
    const duplicate = await pool.query(
      `SELECT id FROM readings
       WHERE user_id = $1
       AND reading_date = $2
       AND time_slot = $3
       AND id != $4`,
      [req.user.id, reading_date, time_slot, id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have an ${time_slot} reading for this date.`
      });
    }

    // Check daily limit excluding current reading
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM readings
       WHERE user_id = $1
       AND reading_date = $2
       AND id != $3`,
      [req.user.id, reading_date, id]
    );

    if (count.rows[0].total >= 4) {
      return res.status(400).json({
        success: false,
        message: "You can add only 4 readings per day."
      });
    }

    // Update reading
    const result = await pool.query(
      `UPDATE readings
       SET reading_date = $1,
           time_slot = $2,
           value = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING id,
                 TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                 time_slot,
                 value,
                 created_at,
                 updated_at`,
      [reading_date, time_slot, Number(value), id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Glucose reading updated successfully.",
      reading: result.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A reading already exists for this time slot and date."
      });
    }

    console.error("Update reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update glucose reading."
    });
  }
};

// DELETE READING
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM readings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Glucose reading deleted successfully."
    });

  } catch (error) {
    console.error("Delete reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete glucose reading."
    });
  }
};

// EXPORT CONTROLLERS
module.exports = {
  createReading,
  getReadings,
  updateReading,
  deleteReading
};
