import { pool } from '../db';

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
};

export function resolveGodBandOverride(env: NodeJS.ProcessEnv = process.env) {
  const raw = String(env.GOD_BAND_OVERRIDE ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  // Development default: GOD can override band-domain checks.
  return env.NODE_ENV !== 'production';
}

export function isBandManagerRole(role: unknown) {
  return String(role || '') === 'owner' || String(role || '') === 'admin';
}

async function isGodUser(userId: number) {
  const [rows] = await pool.query(
    `SELECT role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
  const row = (rows as any[])[0] as { role?: string } | undefined;
  return String(row?.role || '') === 'GOD';
}

export async function getBandRoleForUser(bandId: number, userId: number) {
  const [rows] = await pool.query(
    `SELECT role
     FROM band_members
     WHERE band_id = ?
       AND user_id = ?
       AND status = 'active'
     LIMIT 1`,
    [bandId, userId],
  );
  const row = (rows as any[])[0] as { role: string } | undefined;
  return row?.role ?? null;
}

export async function isActiveBandMember(bandId: number, userId: number) {
  const role = await getBandRoleForUser(bandId, userId);
  return Boolean(role);
}

export async function ensureSoloBandAdmin(userId: number) {
  // Ensure solo projects are always owned by the user in band_members.
  await pool.query(
    `INSERT IGNORE INTO band_members
      (band_id, user_id, role, status, joined_at, updated_at)
     SELECT b.id, ?, 'owner', 'active', NOW(), NOW()
     FROM bands b
     WHERE b.is_solo = 1
       AND b.created_by_user_id = ?`,
    [userId, userId],
  );

  await pool.query(
    `UPDATE band_members bm
     JOIN bands b ON b.id = bm.band_id
     SET bm.role = 'owner',
         bm.status = 'active',
         bm.updated_at = NOW()
     WHERE bm.user_id = ?
       AND b.is_solo = 1
       AND b.created_by_user_id = ?
       AND bm.role NOT IN ('owner', 'admin')`,
    [userId, userId],
  );
}

export async function canManageBandPlanning(bandId: number, userId: number) {
  if (resolveGodBandOverride() && (await isGodUser(userId))) return true;
  const role = await getBandRoleForUser(bandId, userId);
  return isBandManagerRole(role);
}

export async function canManageBandFinance(bandId: number, userId: number) {
  if (resolveGodBandOverride() && (await isGodUser(userId))) return true;
  const role = await getBandRoleForUser(bandId, userId);
  return isBandManagerRole(role);
}

export async function canViewBandDomain(bandId: number, userId: number) {
  if (resolveGodBandOverride() && (await isGodUser(userId))) return true;
  return isActiveBandMember(bandId, userId);
}

export async function canConfigureApp(user: AuthUser) {
  if (user.role === 'GOD') return true;
  const [rows] = await pool.query(
    `SELECT can_access_admin
     FROM admin_access
     WHERE user_id = ?
     LIMIT 1`,
    [user.id],
  );
  const row = (rows as any[])[0] as { can_access_admin: number } | undefined;
  return Boolean(row?.can_access_admin);
}

export async function getAppAccessLevel(user: AuthUser) {
  if (user.role === 'GOD') return 'super_admin';
  const [rows] = await pool.query(
    `SELECT access_level
     FROM admin_access
     WHERE user_id = ?
       AND can_access_admin = 1
     LIMIT 1`,
    [user.id],
  );
  const row = (rows as any[])[0] as { access_level: string } | undefined;
  return row?.access_level ?? null;
}

