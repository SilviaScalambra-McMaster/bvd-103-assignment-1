import Router from '@koa/router';
import listRouter from './lists';

const router = new Router();

// List books route (implemented) - use routes from lists.ts
router.use(listRouter.routes());
router.use(listRouter.allowedMethods());

// Create book route (not yet implemented)
router.post('/books', async (ctx) => {
  ctx.status = 501;
  ctx.body = { error: 'Create book not yet implemented' };
});

// Update book route (not yet implemented)
router.put('/books/:id', async (ctx) => {
  ctx.status = 501;
  ctx.body = { error: 'Update book not yet implemented' };
});

export default router;
