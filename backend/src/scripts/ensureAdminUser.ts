import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = '127.0.0.1',
  DB_USER = 'root',
  DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || '',
  DB_NAME = 'bandwidth',
  ADMIN_EMAIL,
} = process.env as Record<string, string | undefined>;

async function main() {
  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL is not set in .env');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
  });

  console.log(`Ensuring admin user exists for email: ${ADMIN_EMAIL}`);

  const sql = `
    INSERT INTO users (email, display_name, role, created_at, updated_at)
    SELECT ?, ?, 'GOD', NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE email = ?
    )
  `;

  const displayName = 'Dev Admin';
  const [result] = await conn.query(sql, [ADMIN_EMAIL, displayName, ADMIN_EMAIL]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = result;

  if (info.affectedRows > 0) {
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists, nothing to do.');
  }

  await conn.end();
}

main().catch((err) => {
  console.error('Failed to ensure admin user:', err);
  process.exit(1);
});

