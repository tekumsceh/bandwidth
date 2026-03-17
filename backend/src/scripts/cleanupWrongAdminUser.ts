import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = '127.0.0.1',
  DB_USER = 'root',
  DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD || '',
  DB_NAME = 'bandwidth',
} = process.env as Record<string, string | undefined>;

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
  });

  console.log('Deleting mistaken admin user tekumsceh:gmail.com (if present)…');
  const [result] = await conn.query(
    'DELETE FROM users WHERE email = ?',
    ['tekumsceh:gmail.com'],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = result;
  console.log(`Rows deleted: ${info.affectedRows ?? 'unknown'}`);

  await conn.end();
}

main().catch((err) => {
  console.error('Failed to cleanup wrong admin user:', err);
  process.exit(1);
});

