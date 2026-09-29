import Router from '@koa/router';
import { ObjectId } from 'mongodb';

import listRouter from './lists';
import { getBooksCollection } from './database';

const router = new Router();

router.use(listRouter.routes());
router.use(listRouter.allowedMethods());

interface BookInput {
    name: string;
    author: string;
    description: string;
    price: number;
    image: string;
}

function isValidBook(book: unknown): book is BookInput {
    if (typeof book !== 'object' || book === null) {
        return false;
    }

    const candidate = book as Record<string, unknown>;

    return (
        typeof candidate.name === 'string' &&
        typeof candidate.author === 'string' &&
        typeof candidate.description === 'string' &&
        typeof candidate.price === 'number' &&
        Number.isFinite(candidate.price) &&
        typeof candidate.image === 'string'
    );
}

// Create a book
router.post('/books', async (ctx) => {
    try {
        const requestBody: unknown = ctx.request.body;

        if (!isValidBook(requestBody)) {
            ctx.status = 400;
            ctx.body = {
                error:
                    'Invalid book. name, author, description, image must be strings and price must be a number.',
            };
            return;
        }

        const book = requestBody;

        const collection = await getBooksCollection();

        const result = await collection.insertOne({
            name: book.name,
            author: book.author,
            description: book.description,
            price: book.price,
            image: book.image,
        });

        ctx.status = 201;
        ctx.body = {
            id: result.insertedId.toString(),
            name: book.name,
            author: book.author,
            description: book.description,
            price: book.price,
            image: book.image,
        };
    } catch (error) {
        console.error(error);

        ctx.status = 500;
        ctx.body = {
            error: 'Failed to create book.',
        };
    }
});

// Update a book
router.put('/books/:id', async (ctx) => {
    try {
        const id = ctx.params.id;
        const requestBody: unknown = ctx.request.body;

        if (!ObjectId.isValid(id)) {
            ctx.status = 400;
            ctx.body = {
                error: 'Invalid book ID.',
            };
            return;
        }

        if (!isValidBook(requestBody)) {
            ctx.status = 400;
            ctx.body = {
                error:
                    'Invalid book. name, author, description, image must be strings and price must be a number.',
            };
            return;
        }

        const book = requestBody;

        const collection = await getBooksCollection();

        const result = await collection.updateOne(
            {
                _id: new ObjectId(id),
            },
            {
                $set: {
                    name: book.name,
                    author: book.author,
                    description: book.description,
                    price: book.price,
                    image: book.image,
                },
            }
        );

        if (result.matchedCount === 0) {
            ctx.status = 404;
            ctx.body = {
                error: 'Book not found.',
            };
            return;
        }

        ctx.body = {
            id,
            name: book.name,
            author: book.author,
            description: book.description,
            price: book.price,
            image: book.image,
        };
    } catch (error) {
        console.error(error);

        ctx.status = 500;
        ctx.body = {
            error: 'Failed to update book.',
        };
    }
});

// Delete a book
router.delete('/books/:id', async (ctx) => {
    try {
        const id = ctx.params.id;

        if (!ObjectId.isValid(id)) {
            ctx.status = 400;
            ctx.body = {
                error: 'Invalid book ID.',
            };
            return;
        }

        const collection = await getBooksCollection();

        const result = await collection.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            ctx.status = 404;
            ctx.body = {
                error: 'Book not found.',
            };
            return;
        }

        ctx.status = 204;
    } catch (error) {
        console.error(error);

        ctx.status = 500;
        ctx.body = {
            error: 'Failed to delete book.',
        };
    }
});

export default router;