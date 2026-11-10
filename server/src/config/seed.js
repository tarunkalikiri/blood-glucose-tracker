require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("./db");

const seedDatabase = async () => {
  try {
    console.log("Starting Sweety database seeding...");

    const name = "Sweety Demo User";
    const email = "demo@sweety.com";
    const password = "Sweety@123";

    const hashedPassword = await bcrypt.hash(password, 12);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password
       RETURNING id, name, email`,
      [name, email, hashedPassword]
    );

    const user = userResult.rows[0];

    console.log("Demo user ready:", user.email);

    const sampleReadings = [
      ["Morning", 110],
      ["After breakfast", 120],
      ["After lunch", 130],
      ["After dinner", 140]
    ];

    for (const [timeSlot, value] of sampleReadings) {
      await pool.query(
        `INSERT INTO readings
         (user_id, reading_date, time_slot, value)
         VALUES ($1, CURRENT_DATE - INTERVAL '1 day', $2, $3)
         ON CONFLICT (user_id, reading_date, time_slot)
         DO UPDATE SET value = EXCLUDED.value,
                       updated_at = CURRENT_TIMESTAMP`,
        [user.id, timeSlot, value]
      );
    }

    console.log("Four sample readings created successfully.");

    console.log("\nDemo Login Credentials:");
    console.log("Email:", email);
    console.log("Password:", password);

  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedDatabase();