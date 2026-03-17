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

  console.log(`Adding admin user ${ADMIN_EMAIL} as owner to all bands…`);

  const [userRows] = await conn.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [ADMIN_EMAIL],
  );
  const user = (userRows as any[])[0];
  if (!user) {
    console.error('No user found with ADMIN_EMAIL; run ensure-admin first.');
    process.exit(1);
  }
  const userId = user.id as number;

  const sql = `
    INSERT IGNORE INTO band_members (
      band_id,
      user_id,
      role,
      status,
      joined_at,
      updated_at
    )
    SELECT
      b.id       AS band_id,
      ?          AS user_id,
      'owner'    AS role,
      'active'   AS status,
      NOW()      AS joined_at,
      NOW()      AS updated_at
    FROM bands b
  `;

  const [result] = await conn.query(sql, [userId]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = result;
  console.log(`Band memberships inserted (or ignored if existed): ${info.affectedRows ?? 'unknown'}`);

  await conn.end();
}

main().catch((err) => {
  console.error('Failed to add admin to all bands:', err);
  process.exit(1);
});

