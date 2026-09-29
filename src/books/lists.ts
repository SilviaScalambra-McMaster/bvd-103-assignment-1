import Router from '@koa/router';
import { getBooksCollection } from './database';

const listRouter = new Router();

listRouter.get('/books', async (ctx) => {
    try {
        const filters = ctx.query.filters as
            | Array<{ from?: string; to?: string }>
            | undefined;

        if (filters && !Array.isArray(filters)) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid filters.' };
            return;
        }

        const query: Record<string, unknown> = {};

        if (filters && filters.length > 0) {
            const priceConditions = [];

            for (const filter of filters) {
                const from =
                    filter.from !== undefined
                        ? Number(filter.from)
                        : undefined;

                const to =
                    filter.to !== undefined
                        ? Number(filter.to)
                        : undefined;

                if (
                    (from !== undefined && !Number.isFinite(from)) ||
                    (to !== undefined && !Number.isFinite(to)) ||
                    (from !== undefined &&
                        to !== undefined &&
                        from > to)
                ) {
                    ctx.status = 400;
                    ctx.body = {
                        error:
                            'Invalid filters. Each filter must have valid "from" and "to" numbers where from <= to.',
                    };
                    return;
                }

                const condition: Record<string, number> = {};

                if (from !== undefined) {
                    condition.$gte = from;
                }

                if (to !== undefined) {
                    condition.$lte = to;
                }

                priceConditions.push({ price: condition });
            }

            if (priceConditions.length > 0) {
                query.$or = priceConditions;
            }
        }

        const collection = await getBooksCollection();

        const books = await collection.find(query).toArray();

        const result = books.map((book) => ({
            id: book._id.toString(),
            name: book.name,
            author: book.author,
            description: book.description,
            price: book.price,
            image: book.image,
        }));

        ctx.body = result;
    } catch (error) {
        console.error(error);

        ctx.status = 500;
        ctx.body = {
            error: 'Failed to fetch books from MongoDB.',
        };
    }
});

export default listRouter;
