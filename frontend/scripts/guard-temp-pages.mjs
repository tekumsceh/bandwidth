const tempPagesEnabled = String(process.env.VITE_ENABLE_TEMP_PAGES || '').toLowerCase() === 'true';
const allowTempInProd = String(process.env.ALLOW_TEMP_PAGES_IN_PROD || '').toLowerCase() === 'true';

if (tempPagesEnabled && !allowTempInProd) {
  console.error(
    '[build-guard] Production build blocked: temporary pages are enabled. ' +
      'Set VITE_ENABLE_TEMP_PAGES=false before building production artifacts.',
  );
  process.exit(1);
}

console.log('[build-guard] Temporary page guard passed.');

