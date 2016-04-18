import * as Promise from "bluebird";
import { proxy, schema } from "via-core";
import { MockDatabase } from "./mock-database";
export declare class MockProxy implements proxy.Proxy {
    format: string;
    db: MockDatabase;
    constructor(db: MockDatabase);
    build(schema: schema.ViaModelSchema): Promise<void>;
    create(data: Object): Promise<Object>;
    read(filter: Object, options?: proxy.ReadOptions): Promise<proxy.Cursor>;
    readById(id: string, options?: proxy.ReadOptions): Promise<Object>;
    update(filter: Document, update: Object, options?: proxy.UpdateOptions): Promise<proxy.UpdateResult>;
    updateById(id: string, rev: string, update: Object, options?: proxy.UpdateOneOptions): Promise<proxy.UpdateResult>;
    delete(): Promise<any>;
}
