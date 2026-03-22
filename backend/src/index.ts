import { createApp } from './app';
import { ensureV2Schema } from './services/schemaService';

const app = createApp();
const PORT = process.env.PORT || 5000;

async function start() {
  await ensureV2Schema();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Bandwidth backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend', err);
  process.exit(1);
});
