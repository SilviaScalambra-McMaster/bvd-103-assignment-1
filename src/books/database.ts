import { MongoClient, Collection } from "mongodb";

export interface BookDocument {
  name: string;
  author: string;
  description: string;
  price: number;
  image: string;
}

const MONGO_URL = "mongodb://mongo:27017";
const DATABASE_NAME = "books";
const COLLECTION_NAME = "books";

const client = new MongoClient(MONGO_URL);

let collection: Collection<BookDocument> | null = null;

export async function getBooksCollection(): Promise<Collection<BookDocument>> {
  if (!collection) {
    await client.connect();

    collection = client
      .db(DATABASE_NAME)
      .collection<BookDocument>(COLLECTION_NAME);
  }

  return collection;
}
