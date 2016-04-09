import * as Promise from "bluebird";
import { Proxy, ViaSchema, ReadOptions, UpdateOptions, UpdateOneOptions, Cursor, UpdateResult } from "via-core";
import { MockDatabase } from "./mock-database";
export declare class MockProxy implements Proxy {
    format: string;
    db: MockDatabase;
    constructor(db: MockDatabase);
    build(schema: ViaSchema): Promise<void>;
    create(data: Object): Promise<Object>;
    read(filter: Object, options?: ReadOptions): Promise<Cursor>;
    readById(id: string, options?: ReadOptions): Promise<Object>;
    update(filter: Document, update: Object, options?: UpdateOptions): Promise<UpdateResult>;
    updateById(id: string, rev: string, update: Object, options?: UpdateOneOptions): Promise<UpdateResult>;
    delete(): Promise<any>;
}
