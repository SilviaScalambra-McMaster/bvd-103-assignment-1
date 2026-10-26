import { describe, expect, it } from "vitest";
import { InMemoryWarehouse } from "./in_memory_warehouse_data";

describe("InMemoryWarehouse", () => {
  it("starts with no copies of a book", async () => {
    const warehouse = new InMemoryWarehouse();

    expect(await warehouse.getCopies("book-1")).toEqual({});
  });

  it("places copies of a book on a shelf", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 3);

    expect(await warehouse.getCopiesOnShelf("book-1", "shelf-A")).toBe(3);
    expect(await warehouse.getCopies("book-1")).toEqual({
      "shelf-A": 3,
    });
  });

  it("adds copies when the same book is placed on the same shelf", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 2);
    await warehouse.placeBookOnShelf("book-1", "shelf-A", 4);

    expect(await warehouse.getCopiesOnShelf("book-1", "shelf-A")).toBe(6);
  });

  it("tracks copies on different shelves separately", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 2);
    await warehouse.placeBookOnShelf("book-1", "shelf-B", 5);

    expect(await warehouse.getCopies("book-1")).toEqual({
      "shelf-A": 2,
      "shelf-B": 5,
    });
  });

  it("rejects zero or negative copy counts", async () => {
    const warehouse = new InMemoryWarehouse();

    await expect(
      warehouse.placeBookOnShelf("book-1", "shelf-A", 0),
    ).rejects.toThrow();

    await expect(
      warehouse.placeBookOnShelf("book-1", "shelf-A", -1),
    ).rejects.toThrow();
  });

  it("removes copies from a shelf", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 5);
    await warehouse.removeBooksFromShelf("book-1", "shelf-A", 2);

    expect(await warehouse.getCopiesOnShelf("book-1", "shelf-A")).toBe(3);
  });

  it("removes a shelf when its last copy is taken", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 2);
    await warehouse.removeBooksFromShelf("book-1", "shelf-A", 2);

    expect(await warehouse.getCopies("book-1")).toEqual({});
  });

  it("rejects removing more copies than a shelf contains", async () => {
    const warehouse = new InMemoryWarehouse();

    await warehouse.placeBookOnShelf("book-1", "shelf-A", 2);

    await expect(
      warehouse.removeBooksFromShelf("book-1", "shelf-A", 3),
    ).rejects.toThrow();

    expect(await warehouse.getCopiesOnShelf("book-1", "shelf-A")).toBe(2);
  });

  it("keeps separate warehouse instances independent", async () => {
    const firstWarehouse = new InMemoryWarehouse();
    const secondWarehouse = new InMemoryWarehouse();

    await firstWarehouse.placeBookOnShelf("book-1", "shelf-A", 3);

    expect(await secondWarehouse.getCopies("book-1")).toEqual({});
  });
});
