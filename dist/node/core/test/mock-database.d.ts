import { Cursor, Dictionary, UpdateResult } from "via-core";
export declare class MockDatabase {
    data: any[];
    index: Dictionary<any>;
    create(doc: Object): Object;
    read(): Cursor;
    update(): UpdateResult;
    clear(): MockDatabase;
    private static nextId;
    private static generateId();
    private static jsonClone(data);
}
