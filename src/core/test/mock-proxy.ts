import * as Promise from "bluebird";
import {Proxy, ViaSchema, ReadOptions, UpdateOptions, UpdateOneOptions, Cursor, UpdateResult} from "via-core";
import {MockDatabase} from "./mock-database";

export class MockProxy implements Proxy {
  format: string;
  db: MockDatabase;

  constructor (db: MockDatabase) {
    this.format = "json";
    this.db = db;
  }

  build(schema: ViaSchema): Promise<void> {
    return Promise.resolve();
  }

  create(data: Object): Promise<Object> {
    return Promise.try(() => {
      return this.db.create(data);
    });
  }

  read(filter: Object, options?: ReadOptions): Promise<Cursor> {
    return undefined;
  }

  readById(id: string, options?: ReadOptions): Promise<Object> {
    return undefined;
  }

  update(filter: Document, update: Object, options?: UpdateOptions): Promise<UpdateResult> {
    return undefined;
  }

  updateById(id: string, rev: string, update: Object, options?: UpdateOneOptions): Promise<UpdateResult> {
    return undefined;
  }

  delete(): Promise<any> {
    return undefined;
  }
}
