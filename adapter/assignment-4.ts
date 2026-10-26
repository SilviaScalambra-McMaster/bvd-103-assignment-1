import previous_assignment from "./assignment-3";
import {
  DatabaseWarehouse,
  getWarehouseDatabaseAccessor,
} from "../src/warehouse/warehouse_database";

export type BookID = string;
export type ShelfId = string;
export type OrderId = string;

export interface Book {
  id?: BookID;
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
  stock?: number;
}

export interface Filter {
  from?: number;
  to?: number;
  name?: string;
  author?: string;
}

const warehouse = async () =>
  new DatabaseWarehouse(await getWarehouseDatabaseAccessor());

async function lookupBookById(bookId: BookID): Promise<Book> {
  const books = await previous_assignment.listBooks();
  const book = books.find((item) => item.id === bookId);
  if (!book) throw new Error(`Book not found: ${bookId}`);
  const copies = await (await warehouse()).getCopies(bookId);
  return {
    ...book,
    stock: Object.values(copies).reduce((sum, count) => sum + count, 0),
  };
}

async function listBooks(filters?: Filter[]): Promise<Book[]> {
  const books = await previous_assignment.listBooks(filters);
  const store = await warehouse();
  return Promise.all(
    books.map(async (book) => {
      const copies = await store.getCopies(book.id ?? "");
      return {
        ...book,
        stock: Object.values(copies).reduce((sum, count) => sum + count, 0),
      };
    }),
  );
}

async function createOrUpdateBook(book: Book): Promise<BookID> {
  return previous_assignment.createOrUpdateBook(book);
}

async function removeBook(bookId: BookID): Promise<void> {
  await lookupBookById(bookId);
  const store = await warehouse();
  const shelves = await store.getCopies(bookId);
  for (const [shelf, count] of Object.entries(shelves)) {
    await store.removeBooksFromShelf(bookId, shelf, count);
  }
  await previous_assignment.removeBook(bookId);
}

async function placeBooksOnShelf(
  bookId: BookID,
  numberOfBooks: number,
  shelf: ShelfId,
): Promise<void> {
  await lookupBookById(bookId);
  await (await warehouse()).placeBookOnShelf(bookId, shelf, numberOfBooks);
}

async function orderBooks(bookIds: BookID[]): Promise<{ orderId: OrderId }> {
  if (!bookIds.length)
    throw new Error("An order must contain at least one book");
  const books: Record<BookID, number> = {};
  for (const bookId of bookIds) {
    await lookupBookById(bookId);
    books[bookId] = (books[bookId] ?? 0) + 1;
  }
  return { orderId: await (await warehouse()).placeOrder(books) };
}

async function findBookOnShelf(
  bookId: BookID,
): Promise<Array<{ shelf: ShelfId; count: number }>> {
  const shelves = await (await warehouse()).getCopies(bookId);
  return Object.entries(shelves).map(([shelf, count]) => ({ shelf, count }));
}

async function listOrders(): Promise<
  Array<{ orderId: OrderId; books: Record<BookID, number> }>
> {
  const orders = await (await warehouse()).listOrders();
  return orders.map(({ orderId, books }) => ({ orderId, books }));
}

async function findOldestOrder(): Promise<
  { orderId: OrderId; books: Record<BookID, number> } | false
> {
  const orders = await listOrders();
  return orders[0] ?? false;
}

async function fulfilOrder(
  orderId: OrderId,
  booksFulfilled: Array<{
    book: BookID;
    shelf: ShelfId;
    numberOfBooks: number;
  }>,
): Promise<void> {
  const store = await warehouse();
  const order = await store.getOrder(orderId);
  if (order === false) throw new Error(`Order not found: ${orderId}`);

  const removals = new Map<BookID, Map<ShelfId, number>>();
  for (const item of booksFulfilled) {
    if (!Number.isInteger(item.numberOfBooks) || item.numberOfBooks <= 0) {
      throw new Error("Number of books must be a positive integer");
    }
    const shelves = removals.get(item.book) ?? new Map<ShelfId, number>();
    shelves.set(
      item.shelf,
      (shelves.get(item.shelf) ?? 0) + item.numberOfBooks,
    );
    removals.set(item.book, shelves);
  }

  for (const [bookId, required] of Object.entries(order)) {
    const supplied = [...(removals.get(bookId)?.values() ?? [])].reduce(
      (sum, count) => sum + count,
      0,
    );
    if (supplied !== required)
      throw new Error(
        `Order ${orderId} requires ${required} copies of book ${bookId}`,
      );
  }
  for (const bookId of removals.keys()) {
    if (!(bookId in order))
      throw new Error(`Book ${bookId} is not part of order ${orderId}`);
  }

  for (const [bookId, shelves] of removals) {
    for (const [shelf, count] of shelves) {
      if ((await store.getCopiesOnShelf(bookId, shelf)) < count) {
        throw new Error(
          `Not enough copies of book ${bookId} on shelf ${shelf}`,
        );
      }
    }
  }

  for (const [bookId, shelves] of removals) {
    for (const [shelf, count] of shelves) {
      await store.removeBooksFromShelf(bookId, shelf, count);
    }
  }
  await store.removeOrder(orderId);
}

const assignment = "assignment-4";

export default {
  assignment,
  createOrUpdateBook,
  removeBook,
  listBooks,
  placeBooksOnShelf,
  orderBooks,
  findBookOnShelf,
  fulfilOrder,
  listOrders,
  findOldestOrder,
  lookupBookById,
};
