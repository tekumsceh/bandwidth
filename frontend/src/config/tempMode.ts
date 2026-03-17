export const TEMP_PAGES_ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_TEMP_PAGES || '').toLowerCase() === 'true';

export const FEATURE_FREEZE_ACTIVE =
  String(import.meta.env.VITE_FEATURE_FREEZE || 'true').toLowerCase() !== 'false';

