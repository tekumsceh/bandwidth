import type { Request, Response, Router } from 'express';
import { getUserSchedule } from '../../services/eventsService';

/** GET / — list dates for bands the current user is a member of */
export function registerDateScheduleListRoutes(router: Router) {
  router.get('/', async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const rows = await getUserSchedule(currentUser.id);
      res.json(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching dates', err);
      res.status(500).json({ error: 'Failed to load dates' });
    }
  });
}
