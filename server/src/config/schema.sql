
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    reading_date DATE NOT NULL,

    time_slot VARCHAR(30) NOT NULL,

    value INTEGER NOT NULL
        CHECK (value BETWEEN 40 AND 600),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_time_slot CHECK (
        time_slot IN (
            'Morning',
            'After breakfast',
            'After lunch',
            'After dinner'
        )
    ),

    CONSTRAINT unique_user_date_slot
        UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_readings_user_date
ON readings(user_id, reading_date);
