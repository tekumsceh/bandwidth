import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bandwidth',
  });

  const [dateStats] = await conn.query(
    `SELECT
      CURDATE() AS today,
      MIN(event_date) AS min_date,
      MAX(event_date) AS max_date,
      SUM(CASE WHEN event_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_count,
      SUM(CASE WHEN event_date < CURDATE() THEN 1 ELSE 0 END) AS past_count
     FROM dates`,
  );

  const [futureRows] = await conn.query(
    `SELECT id, event_date, city, venue_name, status, category
     FROM dates
     WHERE event_date >= CURDATE()
     ORDER BY event_date ASC
     LIMIT 15`,
  );

  console.log({
    stats: (dateStats as any[])[0],
    future_rows: futureRows,
  });

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

