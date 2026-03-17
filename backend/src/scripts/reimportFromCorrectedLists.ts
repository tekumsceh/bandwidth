import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const EXCHANGE_RSD_PER_EUR = 116.5;

const DATES_RAW = `
02.01.2025.|Beograd||Kirija|50|Mirijevo kirija Januar|Saint Louis||
03.01.2025.|Tuzla|GLavni Trg||120||Saint Louis||
31.01.2025.|Bec|Husendorf||120||Saint Louis||
01.02.2025.|Minhen|Boxwerk||120||Saint Louis||
08.02.2025.|Novi Sad||PKV Ata karnet|18|Dodatni listovi|trosak|Saint Louis
16.02.2025.|Herceg Novi|Trg||120||Saint Louis||
21.02.2025.|Sabac|Gradsko pozorište||120||Saint Louis||
21.02.2025.|Beograd||Kirija|50|Mirijevo Kirija za februar|Trosak|Saint Louis
22.02.2025.|Bjelasnica|Beneton||120||Saint Louis||
03.03.2025.|Novi Sad||PKV Ata karnet|32|Dodatni listovi|trosak|Saint Louis
08.03.2025.|Beograd|Dom Omladine||422|Laibach|Trosak|Solo
10.03.2025.|Banja Luka|Banski Dvor||120||Saint Louis||
21.03.2025.|Beograd||torobox|120|Depozit|Saint Louis||
10.04.2025.|Novi Sad|Bulevar books||120||Marko LOuis||
11.04.2025.|Novi Sad|Bulevar books||120||Marko LOuis||
01.05.2025.|Kotor|Vimac||120||Marko LOuis||
01.05.2025.|Novi Sad||PKV Ata karnet|38|Dodatni listovi|trosak|Saint Louis
04.05.2025.|Beograd|Amsterdam||154|splav|Saint Louis||
08.05.2025.|Sarajevo|Dom Mladih||120||Marko LOuis||
23.05.2025.|Umag|seastar festival||120||Marko LOuis||
25.05.2025.|Beograd|Sava Sava||154|splav|Saint Louis||
30.05.2025.|Beograd|Bitef||154||Saint Louis||
31.05.2025.|Beograd||Smeštaj|100||Saint Louis||
31.05.2025.|Beograd|Kalemegdanska terasa||120||Saint Louis||
31.05.2025.|Beograd|Karbon||154||Saint Louis||
07.06.2025.|Beograd|Move||154||Saint Louis||
08.06.2025.|Beograd|Bitef||154||Saint Louis||
15.06.2025.|Zemun|Glamoure Event Center||154||Saint Louis||
20.06.2025.|Jakovo|Bazeni||154||Saint Louis||
28.06.2025.|Ecka|Dvorac||120||Saint Louis||
03.07.2025.|Beograd|BOHO||114||Saint Louis||
03.07.2025.|Novi Sad||PKV Ata karnet|131|Novi ata karnet|trosak|Saint Louis
12.07.2025.|Novi Sad|Exit||120||Saint Louis||
14.07.2025.|Bihac|||120||Saint Louis||
18.07.2025.|Tivat|||120||Saint Louis||
19.07.2025.|Irig|green day||120||Saint Louis||
20.07.2025.|Tjentiste|Ok Fest||120||Saint Louis||
25.07.2025.|Cetinje|Trg||120||Saint Louis||
26.07.2025.|Ulcinj|Pacha||120||Saint Louis||
27.07.2025.|Ulcinj|Pacha||120||Saint Louis||
11.08.2025.|Novi Sad||PKV Ata karnet|75|Dodatni listovi|trosak|Saint Louis
16.08.2025.|Banja Luka|Dvorac||120||Saint Louis||
20.08.2025.|Sarajevo|||120||Saint Louis||
20.08.2025.|Novi Sad|Stringer||78|stalak za mikrofon|trosak|Saint Louis
21.08.2025.|Sarajevo|Botanicki Vrt||120||Saint Louis||
23.08.2025.|Ulcinj|Pacha||120||Saint Louis||
24.08.2025.|Ulcinj|Pacha||120||Saint Louis||
30.08.2025.|Podgorica|Hotel Podgorica||120|svadba|Saint Louis||
11.09.2025.|Beograd|Muzej africke umetnosti||154||Saint Louis||
20.09.2025.|Kragujevac|Triptih||120||Marko Louis||
25.09.2025.|Nis|Livnica||120||Saint Louis||
29.09.2025.|Novi Sad||PKV Ata karnet|17|Dodatni listovi|trosak|Saint Louis
30.09.2025.|Kac||marko krevet|129|Krevet|Trosak|Solo
02.10.2025.|Bec|Szene||120||Saint Louis||
03.10.2025.|Cirih|Dynamo||120||Saint Louis||
06.10.2025.|Beograd||Za Uniqu|154||Saint Louis||
07.10.2025.|Novi Sad||PKV Ata karnet|17|Dodatni listovi|Saint Louis||
10.10.2025.|Beograd|Beton hala||154||Saint Louis||
17.10.2025.|Bijeljina|Krov Kulturnog centra||120||Saint Louis||
10.11.2025.|Novi Sad||PKV Ata karnet|17|Dodatni listovi|trosak|Saint Louis
13.11.2025.|zagreb|Sax!||120||Saint Louis||
14.11.2025.|Banja Luka|Hotel Bosna||120||Saint Louis||
21.11.2025.|Novi Pazar|Kulturni Centar||120||Saint Louis||
28.11.2025.|Bar|Hotel princess||120||Saint Louis||
06.12.2025.|Sarajevo|Dom mladih||120||Saint Louis||
09.12.2025.|Beograd|JDP Akustika s markom||146||Saint Louis||
12.12.2025.|Beograd|Studio 8||94|Kesic , Kosutnjak|Saint Louis||
20.12.2025.|Novi Sad|||13|Dodatni listovi|trosak|Saint Louis
21.12.2025.|Beograd|Zappa barka||154||Saint Louis||
22.12.2025.|Beograd|Zappa barka||154||Saint Louis||
22.12.2025.|Bec||Mikrofon|84|Thoman Nabavka|trosak|Saint Louis
25.12.2025.|Beograd|Infinity||154||Saint Louis||
26.12.2025.|Zrenjanin|Lion Pub||120||Saint Louis||
29.12.2025.|Beograd|Food hangar||154||Saint Louis||
30.12.2025.|Budva|Trg||120||Marko Louis||
31.12.2025.|Podgorica|trg||500||Marko Louis||
06.02.2026.|Beograd|Bitef||184||Saint Louis||
08.02.2026.|Novi Sad||PKV Ata karnet|13|dodatni listovi|trosak|Saint Louis
13.02.2026.|Ljubljana|Kino Siska||150||Marko Louis||
22.02.2026.|Beograd|||184||Saint Louis||
04.03.2026.|Beograd|Hala Jedan BEogradskog sajma||184||Marko Louis||
05.03.2026.|Beograd|Hangar 3||184||Saint Louis||
14.03.2026.|Kragujevac|Top Pivara||150||Marko Louis||
`;

const PAYMENTS_RAW = `
|3000|10000|
|100|8000|
|62|20000|
|150|6600|
|50|9040|
|250|28000|
|200|15000|
|200|20000|
|555|40000|
|450|50000|
|100|40000|
|400|26000|
||40000|
||16000|
22.02.2026.|600|60000|14.03.2026.
||18000|15.03.2026.
||30000|15.03.2026.
`;

type DateRow = {
  eventDate: string;
  city: string | null;
  venue: string | null;
  expenseText: string | null;
  price: number;
  description: string | null;
  bandRaw: string;
  expenseForRaw: string | null;
};

type AllocationRow = { dateId: number; bandId: number; eventDate: string; remaining: number };

function normalize(s: string | null | undefined) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isTrosakBandMarker(v: string | null | undefined) {
  const x = normalize(v);
  return x === 'trosak' || x === 'expense';
}

function parseDate(raw: string) {
  const c = raw.replace(/\.$/, '').trim();
  const m = c.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toNum(raw: string | null | undefined) {
  const s = (raw || '').replace(',', '.').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseDates(): DateRow[] {
  const out: DateRow[] = [];
  for (const l of DATES_RAW.split('\n')) {
    const line = l.trim();
    if (!line) continue;
    const noComma = line.endsWith(',') ? line.slice(0, -1) : line;
    const p = noComma.split('|').map((x) => x.trim());
    if (p.length < 8) continue;
    const d = parseDate(p[0]);
    if (!d) continue;
    out.push({
      eventDate: d,
      city: p[1] || null,
      venue: p[2] || null,
      expenseText: p[3] || null,
      price: toNum(p[4]),
      description: p[5] || null,
      bandRaw: p[6] || '',
      expenseForRaw: p[7] || null,
    });
  }
  return out;
}

function parsePayments() {
  const out: { dateForEur: string | null; eur: number; rsd: number; dateForRsd: string | null }[] = [];
  for (const l of PAYMENTS_RAW.split('\n')) {
    const line = l.trim();
    if (!line) continue;
    const noComma = line.endsWith(',') ? line.slice(0, -1) : line;
    const p = noComma.split('|').map((x) => x.trim());
    if (p.length < 4) continue;
    out.push({
      dateForEur: p[0] ? parseDate(p[0]) : null,
      eur: toNum(p[1]),
      rsd: toNum(p[2]),
      dateForRsd: p[3] ? parseDate(p[3]) : null,
    });
  }
  return out;
}

async function insertPayment(
  conn: mysql.Connection,
  params: {
    dateId: number;
    bandId: number;
    userId: number | null;
    kind: 'member_allocation' | 'member_paid' | 'expense';
    label: string;
    amountEur: number;
    amountOriginal: number;
    currency: string;
    exchangeRate: number;
    createdBy: number;
    createdAt: string;
  },
) {
  await conn.query(
    `INSERT INTO payments
      (date_id, band_id, user_id, kind, direction, method, label, amount_eur, amount_original, currency, exchange_rate, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'out', 'other', ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
    [
      params.dateId,
      params.bandId,
      params.userId,
      params.kind,
      params.label,
      round2(params.amountEur),
      round2(params.amountOriginal),
      params.currency,
      params.exchangeRate,
      params.createdBy,
      params.createdAt,
    ],
  );
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bandwidth',
    multipleStatements: true,
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error('ADMIN_EMAIL is missing');

  await conn.beginTransaction();
  try {
    const [uRows] = await conn.query(`SELECT id FROM users WHERE email=? LIMIT 1`, [adminEmail]);
    const user = (uRows as any[])[0];
    if (!user) throw new Error('Admin user not found');
    const userId = Number(user.id);

    const [soloRows] = await conn.query(
      `SELECT id FROM bands WHERE is_solo=1 AND created_by_user_id=? ORDER BY id ASC LIMIT 1`,
      [userId],
    );
    const solo = (soloRows as any[])[0];
    if (!solo) throw new Error('Solo band for admin user not found');

    const [bandRows] = await conn.query(`SELECT id, name FROM bands`);
    const bandMap = new Map<string, number>();
    for (const b of bandRows as any[]) bandMap.set(normalize(String(b.name)), Number(b.id));
    bandMap.set('solo', Number(solo.id));

    await conn.query(`DELETE FROM dates`);
    await conn.query(`ALTER TABLE dates AUTO_INCREMENT = 1`);
    await conn.query(`ALTER TABLE payments AUTO_INCREMENT = 1`);

    const allocations: AllocationRow[] = [];
    for (const r of parseDates()) {
      const bandMarkerExpense = isTrosakBandMarker(r.bandRaw);
      const isSoloBand = normalize(r.bandRaw) === 'solo';
      const targetBandName = bandMarkerExpense
        ? (r.expenseForRaw || '')
        : isSoloBand
          ? 'solo'
          : r.bandRaw;
      const bandId = bandMap.get(normalize(targetBandName));
      if (!bandId) throw new Error(`Band not found: ${targetBandName}`);

      const [ins] = await conn.query(
        `INSERT INTO dates
          (band_id, event_date, title, venue_name, city, status, category, event_price, currency, description, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, 'done', ?, ?, 'EUR', ?, ?, NOW())`,
        [
          bandId,
          r.eventDate,
          r.venue,
          r.city,
          bandMarkerExpense ? 'running_cost' : null,
          r.price,
          [r.description, r.expenseText].filter(Boolean).join(' | ') || null,
          `${r.eventDate} 12:00:00`,
        ],
      );
      const dateId = (ins as any).insertId as number;

      // Every row is final personal allocation assigned to the user.
      await insertPayment(conn, {
        dateId,
        bandId,
        userId,
        kind: 'member_allocation',
        label: 'Imported personal allocation',
        amountEur: r.price,
        amountOriginal: r.price,
        currency: 'EUR',
        exchangeRate: 1,
        createdBy: userId,
        createdAt: `${r.eventDate} 12:05:00`,
      });
      allocations.push({ dateId, bandId, eventDate: r.eventDate, remaining: round2(r.price) });

      // If band marker is trosak, also import explicit expense for target band, incurred by current user.
      if (bandMarkerExpense) {
        await insertPayment(conn, {
          dateId,
          bandId,
          userId,
          kind: 'expense',
          label: r.expenseText || r.description || 'Imported expense',
          amountEur: r.price,
          amountOriginal: r.price,
          currency: 'EUR',
          exchangeRate: 1,
          createdBy: userId,
          createdAt: `${r.eventDate} 12:10:00`,
        });
      }

      // Beograd transport rule for show rows, except Kalemegdanska terasa.
      const isBeograd = normalize(r.city) === 'beograd';
      const isSpecialPrice = r.price === 154 || r.price === 184;
      const isKalemegdan = normalize(r.venue) === 'kalemegdanska terasa';
      if (!bandMarkerExpense && isBeograd && isSpecialPrice && !isKalemegdan) {
        const eurTransport = round2(4000 / EXCHANGE_RSD_PER_EUR);
        await insertPayment(conn, {
          dateId,
          bandId,
          userId: null,
          kind: 'expense',
          label: 'Transport band 4000 RSD',
          amountEur: eurTransport,
          amountOriginal: 4000,
          currency: 'RSD',
          exchangeRate: EXCHANGE_RSD_PER_EUR,
          createdBy: userId,
          createdAt: `${r.eventDate} 12:15:00`,
        });
        await insertPayment(conn, {
          dateId,
          bandId,
          userId,
          kind: 'expense',
          label: 'Transport personal 4000 RSD',
          amountEur: eurTransport,
          amountOriginal: 4000,
          currency: 'RSD',
          exchangeRate: EXCHANGE_RSD_PER_EUR,
          createdBy: userId,
          createdAt: `${r.eventDate} 12:16:00`,
        });
      }
    }

    const applyPaid = async (amountEur: number, preferredDate: string | null, currency: 'EUR' | 'RSD', rate: number, yearScope?: number) => {
      let remaining = round2(amountEur);
      if (remaining <= 0) return;

      const pool = allocations
        .filter((a) => a.remaining > 0)
        .filter((a) => (yearScope ? Number(a.eventDate.slice(0, 4)) === yearScope : true))
        .sort((a, b) => (a.eventDate < b.eventDate ? -1 : a.eventDate > b.eventDate ? 1 : a.dateId - b.dateId));

      const ordered: AllocationRow[] = [];
      if (preferredDate) ordered.push(...pool.filter((p) => p.eventDate === preferredDate));
      ordered.push(...pool.filter((p) => !ordered.includes(p)));

      for (const a of ordered) {
        if (remaining <= 0) break;
        const take = round2(Math.min(remaining, a.remaining));
        if (take <= 0) continue;
        a.remaining = round2(a.remaining - take);
        remaining = round2(remaining - take);
        await insertPayment(conn, {
          dateId: a.dateId,
          bandId: a.bandId,
          userId,
          kind: 'member_paid',
          label: 'Imported payment',
          amountEur: take,
          amountOriginal: currency === 'EUR' ? take : round2(take * rate),
          currency,
          exchangeRate: currency === 'EUR' ? 1 : rate,
          createdBy: userId,
          createdAt: `${preferredDate || a.eventDate} 13:00:00`,
        });
      }
    };

    for (const p of parsePayments()) {
      if (p.eur > 0) await applyPaid(p.eur, p.dateForEur, 'EUR', 1, p.dateForEur ? undefined : 2025);
      if (p.rsd > 0) await applyPaid(round2(p.rsd / EXCHANGE_RSD_PER_EUR), p.dateForRsd, 'RSD', EXCHANGE_RSD_PER_EUR, p.dateForRsd ? undefined : 2025);
    }

    const [sumRows] = await conn.query(
      `SELECT
         COALESCE(SUM(CASE WHEN kind='member_allocation' AND user_id=? THEN amount_eur ELSE 0 END),0) AS allocated,
         COALESCE(SUM(CASE WHEN kind='member_paid' AND user_id=? THEN amount_eur ELSE 0 END),0) AS paid,
         COUNT(*) AS payments_count
       FROM payments`,
      [userId, userId],
    );
    const s = (sumRows as any[])[0];

    const [dateRows] = await conn.query(`SELECT COUNT(*) AS c FROM dates`);
    const d = (dateRows as any[])[0];

    await conn.commit();
    console.log({
      dates: Number(d.c || 0),
      allocated_eur: round2(Number(s.allocated || 0)),
      paid_eur: round2(Number(s.paid || 0)),
      payment_rows: Number(s.payments_count || 0),
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Reimport failed:', err);
  process.exit(1);
});

