import * as Bluebird from "bluebird";
import { proxy, schema } from "via-core";
import { MockDatabase } from "./mock-database";
export declare class MockProxy implements proxy.Proxy {
    format: string;
    db: MockDatabase;
    constructor(db: MockDatabase);
    build(schema: schema.ViaModelSchema): Bluebird<void>;
    create(data: Object): Bluebird<Object>;
    read(filter: Object, options?: proxy.ReadOptions): Bluebird<proxy.Cursor>;
    readById(id: string, options?: proxy.ReadOptions): Bluebird<Object>;
    update(filter: Document, update: Object, options?: proxy.UpdateOptions): Bluebird<proxy.UpdateResult>;
    updateById(id: string, rev: string, update: Object, options?: proxy.UpdateOneOptions): Bluebird<proxy.UpdateResult>;
    delete(): Bluebird<any>;
}
