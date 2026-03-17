import fs from 'fs';

const TRANSCRIPT_PATH =
  'C:\\Users\\Mali Od Palube\\.cursor\\projects\\c-xampp-htdocs-gigstr\\agent-transcripts\\1641944d-8b32-4b01-b564-0821649418d9\\1641944d-8b32-4b01-b564-0821649418d9.jsonl';

function toNum(raw: string | undefined) {
  const s = (raw || '').replace(',', '.').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function main() {
  const text = fs.readFileSync(TRANSCRIPT_PATH, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  let latest: string | null = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as any;
      if (obj.role !== 'user') continue;
      const blocks = obj?.message?.content;
      if (!Array.isArray(blocks)) continue;
      const first = blocks[0]?.text as string | undefined;
      if (!first) continue;
      if (first.includes('Redo calculations for these lists')) {
        latest = first;
      }
    } catch {
      // ignore malformed lines
    }
  }

  if (!latest) {
    throw new Error('Could not find latest user message with both lists.');
  }

  const srcLines = latest.split('\n').map((l) => l.trim());
  let mode: 'none' | 'dates' | 'payments' = 'none';
  let datesTotal = 0;
  let datesRows = 0;
  let paymentsEur = 0;
  let paymentsRsd = 0;
  let paymentRows = 0;

  for (const line of srcLines) {
    if (!line) continue;
    if (line.toLowerCase().startsWith('date') && line.includes('Expense for')) {
      mode = 'dates';
      continue;
    }
    if (line.startsWith('Date payed for EUR')) {
      mode = 'payments';
      continue;
    }
    if (!line.includes('|')) continue;

    const clean = line.endsWith(',') ? line.slice(0, -1).trim() : line;
    const parts = clean.split('|').map((p) => p.trim());

    if (mode === 'dates') {
      if (parts.length < 8) continue;
      const price = toNum(parts[4]);
      datesTotal += price;
      datesRows += 1;
      continue;
    }

    if (mode === 'payments') {
      if (parts.length < 4) continue;
      paymentsEur += toNum(parts[1]);
      paymentsRsd += toNum(parts[2]);
      paymentRows += 1;
      continue;
    }
  }

  const rsdAsEurRounded = Math.round(paymentsRsd / 116.5);
  const paymentsTotal = paymentsEur + rsdAsEurRounded;
  const difference = datesTotal - paymentsTotal;

  console.log(
    JSON.stringify(
      {
        dates_total_price: round2(datesTotal),
        dates_rows_counted: datesRows,
        payments_eur_total: round2(paymentsEur),
        payments_rsd_total: round2(paymentsRsd),
        payments_rsd_as_eur_rounded_116_5: rsdAsEurRounded,
        payments_total: round2(paymentsTotal),
        difference_dates_minus_payments: round2(difference),
        formula: 'SUM(dates.price) - (SUM(pay_eur) + ROUND(SUM(pay_rsd)/116.5))',
      },
      null,
      2,
    ),
  );
}

main();

