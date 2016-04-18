import * as Bluebird from "bluebird";
import {proxy, schema} from "via-core";
import {MockDatabase} from "./mock-database";

export class MockProxy implements proxy.Proxy {
  format: string;
  db: MockDatabase;

  constructor (db: MockDatabase) {
    this.format = "json";
    this.db = db;
  }

  build(schema: schema.ViaModelSchema): Bluebird<void> {
    return Bluebird.resolve();
  }

  create(data: Object): Bluebird<Object> {
    return Bluebird.try(() => {
      return this.db.create(data);
    });
  }

  read(filter: Object, options?: proxy.ReadOptions): Bluebird<proxy.Cursor> {
    return undefined;
  }

  readById(id: string, options?: proxy.ReadOptions): Bluebird<Object> {
    return undefined;
  }

  update(filter: Document, update: Object, options?: proxy.UpdateOptions): Bluebird<proxy.UpdateResult> {
    return undefined;
  }

  updateById(id: string, rev: string, update: Object, options?: proxy.UpdateOneOptions): Bluebird<proxy.UpdateResult> {
    return undefined;
  }

  delete(): Bluebird<any> {
    return undefined;
  }
}
