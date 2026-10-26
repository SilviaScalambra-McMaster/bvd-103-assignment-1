import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { MongoClient, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { InMemoryWarehouse } from "./in_memory_warehouse_data";
import {
  DatabaseWarehouse,
  type WarehouseDatabaseAccessor,
} from "./warehouse_database";
import type { WarehouseData } from "./warehouse_data";

describe.each(["memory", "database"] as const)(
  "WarehouseData contract: %s",
  (implementation) => {
    let mongo: MongoMemoryServer | undefined;
    let client: MongoClient | undefined;
    let db: Db | undefined;
    let warehouse: WarehouseData;

    beforeAll(async () => {
      if (implementation === "database") {
        mongo = await MongoMemoryServer.create();
        client = new MongoClient(mongo.getUri());
        await client.connect();
      }
    }, 120_000);

    beforeEach(() => {
      if (implementation === "memory") {
        warehouse = new InMemoryWarehouse();
      } else {
        db = client!.db(`warehouse_contract_${crypto.randomUUID()}`);
        const accessor: WarehouseDatabaseAccessor = {
          inventory: db.collection("inventory"),
          orders: db.collection("orders"),
        };
        warehouse = new DatabaseWarehouse(accessor);
      }
    });

    afterEach(async () => {
      if (db) {
        await db.dropDatabase();
        db = undefined;
      }
    });

    afterAll(async () => {
      await client?.close();
      await mongo?.stop();
    });

    it("starts with no stock", async () => {
      expect(await warehouse.getCopies("book-1")).toEqual({});
      expect(await warehouse.getCopiesOnShelf("book-1", "A1")).toBe(0);
    });

    it("adds stock and tracks separate shelves", async () => {
      await warehouse.placeBookOnShelf("book-1", "A1", 3);
      await warehouse.placeBookOnShelf("book-1", "A1", 2);
      await warehouse.placeBookOnShelf("book-1", "B2", 4);

      expect(await warehouse.getCopies("book-1")).toEqual({
        A1: 5,
        B2: 4,
      });
    });

    it("rejects invalid stock quantities", async () => {
      await expect(
        warehouse.placeBookOnShelf("book-1", "A1", 0),
      ).rejects.toThrow();

      await expect(
        warehouse.placeBookOnShelf("book-1", "A1", -1),
      ).rejects.toThrow();
    });

    it("removes stock and rejects over-removal", async () => {
      await warehouse.placeBookOnShelf("book-1", "A1", 5);
      await warehouse.removeBooksFromShelf("book-1", "A1", 2);

      expect(await warehouse.getCopiesOnShelf("book-1", "A1")).toBe(3);

      await expect(
        warehouse.removeBooksFromShelf("book-1", "A1", 4),
      ).rejects.toThrow();

      expect(await warehouse.getCopiesOnShelf("book-1", "A1")).toBe(3);
    });

    it("places, lists, and removes orders", async () => {
      const orderId = await warehouse.placeOrder({
        "book-1": 2,
        "book-2": 1,
      });

      expect(await warehouse.getOrder(orderId)).toEqual({
        "book-1": 2,
        "book-2": 1,
      });

      expect(await warehouse.listOrders()).toEqual([
        { orderId, books: { "book-1": 2, "book-2": 1 } },
      ]);

      await warehouse.removeOrder(orderId);

      expect(await warehouse.getOrder(orderId)).toBe(false);
      expect(await warehouse.listOrders()).toEqual([]);
    });

    it("rejects invalid orders", async () => {
      await expect(warehouse.placeOrder({})).rejects.toThrow();
      await expect(warehouse.placeOrder({ "book-1": 0 })).rejects.toThrow();
    });
  },
);
