import * as Promise from "bluebird";
import {proxy, schema} from "via-core";
import {MockDatabase} from "./mock-database";

export class MockProxy implements proxy.Proxy {
  format: string;
  db: MockDatabase;

  constructor (db: MockDatabase) {
    this.format = "json";
    this.db = db;
  }

  build(schema: schema.ViaModelSchema): Promise<void> {
    return Promise.resolve();
  }

  create(data: Object): Promise<Object> {
    return Promise.try(() => {
      return this.db.create(data);
    });
  }

  read(filter: Object, options?: proxy.ReadOptions): Promise<proxy.Cursor> {
    return undefined;
  }

  readById(id: string, options?: proxy.ReadOptions): Promise<Object> {
    return undefined;
  }

  update(filter: Document, update: Object, options?: proxy.UpdateOptions): Promise<proxy.UpdateResult> {
    return undefined;
  }

  updateById(id: string, rev: string, update: Object, options?: proxy.UpdateOneOptions): Promise<proxy.UpdateResult> {
    return undefined;
  }

  delete(): Promise<any> {
    return undefined;
  }
}
