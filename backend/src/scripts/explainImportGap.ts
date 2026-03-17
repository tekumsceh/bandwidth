import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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

function n(v: string | undefined) {
  const s = (v || '').replace(',', '.').trim();
  if (!s) return 0;
  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
}
function norm(v: string | undefined) {
  return (v || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  let rawTotal = 0;
  let modeledExpense = 0;
  for (const l of DATES_RAW.split('\n')) {
    const line = l.trim();
    if (!line) continue;
    const p = (line.endsWith(',') ? line.slice(0, -1) : line).split('|').map((x) => x.trim());
    if (p.length < 8) continue;
    const price = n(p[4]);
    rawTotal += price;
    const isExpenseRow = norm(p[3]) !== '' || ['trosak', 'expense'].includes(norm(p[6]));
    if (isExpenseRow) modeledExpense += price;
  }
  const modeledAllocation = rawTotal - modeledExpense;

  let payEur = 0;
  let payRsd = 0;
  for (const l of PAYMENTS_RAW.split('\n')) {
    const line = l.trim();
    if (!line) continue;
    const p = (line.endsWith(',') ? line.slice(0, -1) : line).split('|').map((x) => x.trim());
    if (p.length < 4) continue;
    payEur += n(p[1]);
    payRsd += n(p[2]);
  }
  const rawPaid = payEur + Math.round(payRsd / 116.5);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bandwidth',
  });
  const [dbRows] = await conn.query(
    `SELECT
      COALESCE(SUM(CASE WHEN kind='member_allocation' THEN amount_eur END),0) AS alloc,
      COALESCE(SUM(CASE WHEN kind='member_paid' THEN amount_eur END),0) AS paid,
      COALESCE(SUM(CASE WHEN kind='expense' THEN amount_eur END),0) AS exp
     FROM payments`,
  );
  await conn.end();
  const db = (dbRows as any[])[0];

  console.log({
    raw_formula: {
      dates_total: rawTotal,
      payments_total: rawPaid,
      difference: rawTotal - rawPaid,
    },
    import_model_from_raw: {
      expense_rows_total_removed_from_allocation: modeledExpense,
      modeled_member_allocation_total: modeledAllocation,
      note: 'Importer computes allocation only from non-expense rows',
    },
    db_after_import: {
      member_allocation: Number(db.alloc || 0),
      member_paid: Number(db.paid || 0),
      expense_total: Number(db.exp || 0),
      note: 'member_paid is capped by remaining allocation during import',
    },
    gaps_explained: {
      raw_dates_vs_db_allocation: rawTotal - Number(db.alloc || 0),
      raw_paid_vs_db_member_paid: rawPaid - Number(db.paid || 0),
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

