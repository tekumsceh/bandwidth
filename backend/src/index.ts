import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Bandwidth backend is running.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Bandwidth backend listening on http://localhost:${PORT}`);
});
