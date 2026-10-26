import type { BookID, OrderId, ShelfId, WarehouseData } from "./warehouse_data";

export class InMemoryWarehouse implements WarehouseData {
  private inventory = new Map<BookID, Map<ShelfId, number>>();

  private orders = new Map<OrderId, Record<BookID, number>>();

  private nextOrderId = 1;

  async placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Count must be a positive integer");
    }

    let shelves = this.inventory.get(bookId);

    if (!shelves) {
      shelves = new Map<ShelfId, number>();
      this.inventory.set(bookId, shelves);
    }

    shelves.set(shelf, (shelves.get(shelf) ?? 0) + count);
  }

  async getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number> {
    return this.inventory.get(bookId)?.get(shelf) ?? 0;
  }

  async getCopies(bookId: BookID): Promise<Record<ShelfId, number>> {
    const shelves = this.inventory.get(bookId);

    if (!shelves) {
      return {};
    }

    return Object.fromEntries(shelves.entries());
  }

  async removeBooksFromShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Count must be a positive integer");
    }

    const shelves = this.inventory.get(bookId);
    const available = shelves?.get(shelf) ?? 0;

    if (available < count) {
      throw new Error("Not enough copies on this shelf");
    }

    const remaining = available - count;

    if (remaining === 0) {
      shelves!.delete(shelf);
    } else {
      shelves!.set(shelf, remaining);
    }

    if (shelves!.size === 0) {
      this.inventory.delete(bookId);
    }
  }

  async getOrder(orderId: OrderId): Promise<Record<BookID, number> | false> {
    const order = this.orders.get(orderId);

    return order ? { ...order } : false;
  }

  async placeOrder(books: Record<BookID, number>): Promise<OrderId> {
    const entries = Object.entries(books);

    if (
      entries.length === 0 ||
      entries.some(([, count]) => !Number.isInteger(count) || count <= 0)
    ) {
      throw new Error("An order must contain positive integer quantities");
    }

    const orderId = String(this.nextOrderId++);
    this.orders.set(orderId, { ...books });

    return orderId;
  }

  async listOrders(): Promise<
    Array<{ orderId: OrderId; books: Record<BookID, number> }>
  > {
    return Array.from(this.orders.entries()).map(([orderId, books]) => ({
      orderId,
      books: { ...books },
    }));
  }

  async removeOrder(orderId: OrderId): Promise<void> {
    if (!this.orders.has(orderId)) {
      throw new Error("Order not found");
    }

    this.orders.delete(orderId);
  }
}
