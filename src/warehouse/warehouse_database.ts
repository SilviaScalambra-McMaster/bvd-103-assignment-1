import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import type { Collection } from "mongodb";
import type {
  BookID,
  OrderId,
  ShelfId,
  WarehouseData,
  WarehouseOrder,
} from "./warehouse_data";

interface InventoryDocument {
  bookId: BookID;
  shelf: ShelfId;
  count: number;
}

interface OrderDocument {
  orderId: OrderId;
  books: Record<BookID, number>;
  createdAt: Date;
}

export interface WarehouseDatabaseAccessor {
  inventory: Collection<InventoryDocument>;
  orders: Collection<OrderDocument>;
}

const client = new MongoClient("mongodb://mongo:27017");
let accessor: WarehouseDatabaseAccessor | null = null;

export async function getWarehouseDatabaseAccessor(): Promise<WarehouseDatabaseAccessor> {
  if (!accessor) {
    await client.connect();
    const database = client.db("warehouse");
    accessor = {
      inventory: database.collection<InventoryDocument>("inventory"),
      orders: database.collection<OrderDocument>("orders"),
    };
  }
  return accessor;
}

export class DatabaseWarehouse implements WarehouseData {
  constructor(private readonly accessor: WarehouseDatabaseAccessor) {}

  async placeBookOnShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    if (!Number.isInteger(count) || count <= 0)
      throw new Error("Count must be a positive integer");
    await this.accessor.inventory.updateOne(
      { bookId, shelf },
      { $inc: { count } },
      { upsert: true },
    );
  }

  async getCopiesOnShelf(bookId: BookID, shelf: ShelfId): Promise<number> {
    const item = await this.accessor.inventory.findOne({ bookId, shelf });
    return item?.count ?? 0;
  }

  async getCopies(bookId: BookID): Promise<Record<ShelfId, number>> {
    const items = await this.accessor.inventory.find({ bookId }).toArray();
    return Object.fromEntries(items.map(({ shelf, count }) => [shelf, count]));
  }

  async removeBooksFromShelf(
    bookId: BookID,
    shelf: ShelfId,
    count: number,
  ): Promise<void> {
    if (!Number.isInteger(count) || count <= 0)
      throw new Error("Count must be a positive integer");
    const result = await this.accessor.inventory.updateOne(
      { bookId, shelf, count: { $gte: count } },
      { $inc: { count: -count } },
    );
    if (!result.modifiedCount)
      throw new Error("Not enough copies on this shelf");
    await this.accessor.inventory.deleteOne({ bookId, shelf, count: 0 });
  }

  async getOrder(orderId: OrderId): Promise<Record<BookID, number> | false> {
    const order = await this.accessor.orders.findOne({ orderId });
    return order ? { ...order.books } : false;
  }

  async placeOrder(books: Record<BookID, number>): Promise<OrderId> {
    const entries = Object.entries(books);
    if (
      !entries.length ||
      entries.some(([, count]) => !Number.isInteger(count) || count <= 0)
    ) {
      throw new Error("An order must contain positive integer quantities");
    }
    const orderId = `${Date.now()}-${randomUUID()}`;
    await this.accessor.orders.insertOne({
      orderId,
      books: { ...books },
      createdAt: new Date(),
    });
    return orderId;
  }

  async listOrders(): Promise<WarehouseOrder[]> {
    const orders = await this.accessor.orders
      .find()
      .sort({ createdAt: 1 })
      .toArray();

    return orders.map(({ orderId, books }) => ({
      orderId,
      books: { ...books },
    }));
  }

  async removeOrder(orderId: OrderId): Promise<void> {
    const result = await this.accessor.orders.deleteOne({ orderId });
    if (!result.deletedCount) throw new Error("Order not found");
  }
}
