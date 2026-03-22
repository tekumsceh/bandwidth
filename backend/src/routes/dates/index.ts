import { Router } from 'express';
import { registerDateCrudRoutes } from './crud';
import { registerDateFinanceStubRoutes } from './financeStubs';
import { registerDateScheduleListRoutes } from './scheduleList';

/**
 * /api/dates — schedule list, CRUD, finance placeholders (same route order as before split).
 */
const router = Router();

registerDateScheduleListRoutes(router);
registerDateFinanceStubRoutes(router);
registerDateCrudRoutes(router);

export default router;
