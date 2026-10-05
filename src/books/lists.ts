import Router from "@koa/router";
import { getBooksCollection } from "./database";

const listRouter = new Router();

interface Filter {
  from?: string;
  to?: string;
  name?: string;
  author?: string;
}

listRouter.get("/books", async (ctx) => {
  try {
    const filters = ctx.query.filters as Filter[] | undefined;

    if (filters !== undefined && !Array.isArray(filters)) {
      ctx.status = 400;
      ctx.body = {
        error: "Invalid filters.",
      };
      return;
    }

    const filterQueries: Record<string, unknown>[] = [];

    for (const filter of filters ?? []) {
      const query: Record<string, unknown> = {};

      if (filter.from !== undefined || filter.to !== undefined) {
        const price: Record<string, number> = {};

        if (filter.from !== undefined) {
          const from = Number(filter.from);

          if (!Number.isFinite(from)) {
            ctx.status = 400;
            ctx.body = {
              error: 'Invalid "from" price.',
            };
            return;
          }

          price.$gte = from;
        }

        if (filter.to !== undefined) {
          const to = Number(filter.to);

          if (!Number.isFinite(to)) {
            ctx.status = 400;
            ctx.body = {
              error: 'Invalid "to" price.',
            };
            return;
          }

          price.$lte = to;
        }

        if (
          price.$gte !== undefined &&
          price.$lte !== undefined &&
          price.$gte > price.$lte
        ) {
          ctx.status = 400;
          ctx.body = {
            error: '"from" must be less than or equal to "to".',
          };
          return;
        }

        query.price = price;
      }

      if (filter.name !== undefined) {
        query.name = {
          $regex: filter.name,
          $options: "i",
        };
      }

      if (filter.author !== undefined) {
        query.author = {
          $regex: filter.author,
          $options: "i",
        };
      }

      filterQueries.push(query);
    }

    const query: Record<string, unknown> =
      filterQueries.length > 0 ? { $or: filterQueries } : {};

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
      error: "Failed to fetch books from MongoDB.",
    };
  }
});

export default listRouter;
