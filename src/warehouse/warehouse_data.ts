export type BookID = string;
export type ShelfId = string;
export type OrderId = string;

export interface WarehouseOrder {
  orderId: OrderId;
  books: Record<BookID, number>;
  createdAt?: Date;
}

export interface WarehouseData {
  placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void>;
  getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number>;
  getCopies(bookId: BookID): Promise<Record<ShelfId, number>>;
  removeBooksFromShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void>;
  getOrder(orderId: OrderId): Promise<Record<BookID, number> | false>;
  placeOrder(books: Record<BookID, number>): Promise<OrderId>;
  listOrders(): Promise<WarehouseOrder[]>;
  removeOrder(orderId: OrderId): Promise<void>;
}
