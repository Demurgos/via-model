import { utils, proxy } from "via-core";
export declare class MockDatabase {
    data: any[];
    index: utils.Document;
    create(doc: Object): Object;
    read(): proxy.Cursor;
    update(): proxy.UpdateResult;
    clear(): MockDatabase;
    private static nextId;
    private static generateId();
    private static jsonClone(data);
}
