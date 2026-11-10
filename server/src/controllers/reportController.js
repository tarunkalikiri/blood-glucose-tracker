const pool = require("../config/db");

// Validate and format the selected date
const getValidDate = (date) => {
  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  if (date > todayString) {
    return null;
  }

  return { year, month, day };
};

// Calculate summary statistics for a date range
const getReportSummary = async (userId, startDate, endDate) => {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS count,
       MAX(value)::int AS highest,
       MIN(value)::int AS lowest,
       ROUND(AVG(value)::numeric, 1)::numeric AS average
     FROM readings
     WHERE user_id = $1
       AND reading_date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );

  const summary = result.rows[0];

  return {
    count: summary.count,
    highest: summary.highest,
    lowest: summary.lowest,
    average: summary.average === null ? null : Number(summary.average)
  };
};

// DAILY REPORT
const getDailyReport = async (req, res) => {
  try {
    const date = req.query.date;
    const validDate = getValidDate(date);

    if (!validDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date that is not in the future."
      });
    }

    const summary = await getReportSummary(req.user.id, date, date);

    const readingsResult = await pool.query(
      `SELECT
         id,
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
         time_slot,
         value
       FROM readings
       WHERE user_id = $1 AND reading_date = $2
       ORDER BY
         CASE time_slot
           WHEN 'Morning' THEN 1
           WHEN 'After breakfast' THEN 2
           WHEN 'After lunch' THEN 3
           WHEN 'After dinner' THEN 4
         END`,
      [req.user.id, date]
    );

    return res.status(200).json({
      success: true,
      report: "Daily",
      date,
      summary,
      readings: readingsResult.rows
    });
  } catch (error) {
    console.error("Daily report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate daily report."
    });
  }
};

// MONTH-TO-DATE REPORT
const getMonthToDateReport = async (req, res) => {
  try {
    const date = req.query.date;
    const validDate = getValidDate(date);

    if (!validDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date that is not in the future."
      });
    }

    const { year, month } = validDate;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = date;

    const summary = await getReportSummary(
      req.user.id,
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      report: "Month-to-date",
      startDate,
      endDate,
      summary
    });
  } catch (error) {
    console.error("Month-to-date report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate month-to-date report."
    });
  }
};

// PREVIOUS FULL MONTH REPORT
const getPreviousMonthReport = async (req, res) => {
  try {
    const date = req.query.date;
    const validDate = getValidDate(date);

    if (!validDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date that is not in the future."
      });
    }

    const { year, month } = validDate;

    // First day of the selected month
    const firstDayOfCurrentMonth = new Date(
      Date.UTC(year, month - 1, 1)
    );

    // Last day of the previous month
    const lastDayOfPreviousMonth = new Date(
      firstDayOfCurrentMonth.getTime() - 86400000
    );

    const previousYear = lastDayOfPreviousMonth.getUTCFullYear();
    const previousMonth = lastDayOfPreviousMonth.getUTCMonth() + 1;

    const startDate = `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`;

    const endDate = [
      previousYear,
      String(previousMonth).padStart(2, "0"),
      String(lastDayOfPreviousMonth.getUTCDate()).padStart(2, "0")
    ].join("-");

    const summary = await getReportSummary(
      req.user.id,
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      report: "Previous full month",
      startDate,
      endDate,
      summary
    });
  } catch (error) {
    console.error("Previous month report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate previous month report."
    });
  }
};

module.exports = {
  getDailyReport,
  getMonthToDateReport,
  getPreviousMonthReport
};