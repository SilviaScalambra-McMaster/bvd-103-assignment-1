import Router from '@koa/router';
import { Book } from '../../adapter/assignment-1';
import books from '../../mcmasteful-book-list.json';

const listRouter = new Router();

listRouter.get('/books', async (ctx) => {
  const filters = ctx.query.filters as
    | Array<{ from?: string; to?: string }>
    | undefined;

  try {
    let bookList = readBooksFromJsonData();

    // Apply filters when one or more price filters are provided.
    if (filters && Array.isArray(filters) && filters.length > 0) {
      if (!validateFilters(filters)) {
        ctx.status = 400;
        ctx.body = {
          error:
            'Invalid filters. Each filter must have valid "from" and "to" numbers where from <= to.',
        };
        return;
      }

      bookList = filterBooks(bookList, filters);
    }

    ctx.body = bookList;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      error: `Failed to fetch books due to: ${error}`,
    };
  }
});

function validateFilters(filters: any): boolean {
  // Filters must exist and be an array.
  if (!filters || !Array.isArray(filters)) {
    return false;
  }

  return filters.every((filter) => {
    const from =
      filter.from !== undefined ? parseFloat(filter.from) : undefined;

    const to =
      filter.to !== undefined ? parseFloat(filter.to) : undefined;

    // If "from" exists, it must be a valid number.
    if (from !== undefined && isNaN(from)) {
      return false;
    }

    // If "to" exists, it must be a valid number.
    if (to !== undefined && isNaN(to)) {
      return false;
    }

    // If both exist, "from" cannot be greater than "to".
    if (from !== undefined && to !== undefined && from > to) {
      return false;
    }

    return true;
  });
}

function readBooksFromJsonData(): Book[] {
  return books as Book[];
}

// A book matches if its price falls within ANY selected filter range.
function filterBooks(
  bookList: Book[],
  filters: Array<{ from?: string; to?: string }>
): Book[] {
  return bookList.filter((book) =>
    filters.some((filter) => {
      const from =
        filter.from !== undefined ? parseFloat(filter.from) : undefined;

      const to =
        filter.to !== undefined ? parseFloat(filter.to) : undefined;

      const matchesFrom = from === undefined || book.price >= from;
      const matchesTo = to === undefined || book.price <= to;

      return matchesFrom && matchesTo;
    })
  );
}

export default listRouter;