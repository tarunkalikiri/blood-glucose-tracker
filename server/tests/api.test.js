process.env.JWT_SECRET = "sweety-test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../src/app");

const token = jwt.sign(
  { userId: 999 },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

const authHeaders = {
  Authorization: `Bearer ${token}`
};

describe("Sweety API Tests", () => {

  // HEALTH CHECK
  test("GET /api/health should return healthy status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Server is healthy");
  });

  // AUTHENTICATION
  test("GET /api/readings should reject requests without a token", async () => {
    const response = await request(app).get("/api/readings");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("GET /api/reports/daily should reject requests without a token", async () => {
    const response = await request(app).get(
      "/api/reports/daily?date=2026-11-10"
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // READING VALIDATION
  test("POST /api/readings should reject values below 40", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeaders)
      .send({
        reading_date: "2026-11-10",
        time_slot: "Morning",
        value: 30
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Value must be between 40 and 600 mg/dl."
    );
  });

  test("POST /api/readings should reject values above 600", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeaders)
      .send({
        reading_date: "2026-11-10",
        time_slot: "Morning",
        value: 650
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Value must be between 40 and 600 mg/dl."
    );
  });

  test("POST /api/readings should reject decimal values", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeaders)
      .send({
        reading_date: "2026-11-10",
        time_slot: "Morning",
        value: 110.5
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Value must be a whole number between 40 and 600 mg/dl."
    );
  });

  test("POST /api/readings should reject future dates", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeaders)
      .send({
        reading_date: "2099-01-01",
        time_slot: "Morning",
        value: 110
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Date cannot be in the future."
    );
  });

  test("POST /api/readings should reject invalid time slots", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeaders)
      .send({
        reading_date: "2026-11-10",
        time_slot: "Midnight",
        value: 110
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Please select a valid time slot."
    );
  });

  // REPORT VALIDATION
  test("GET /api/reports/daily should reject future dates", async () => {
    const response = await request(app)
      .get("/api/reports/daily?date=2099-01-01")
      .set(authHeaders);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test("GET /api/reports/daily should reject invalid dates", async () => {
    const response = await request(app)
      .get("/api/reports/daily?date=2026-02-30")
      .set(authHeaders);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

});