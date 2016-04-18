import {utils, proxy} from "via-core";

export class MockDatabase {
  data: any[];
  index: utils.Document;

  create (doc: Object): Object {
    let jsonDoc = MockDatabase.jsonClone(doc);
    jsonDoc._id = MockDatabase.generateId();
    this.data.push(jsonDoc);
    return MockDatabase.jsonClone(jsonDoc);
  }

  read (): proxy.Cursor {
    let data = MockDatabase.jsonClone(this.data);
    return {
      toArray: () => {
        return data;
      }
    }
  }

  update (): proxy.UpdateResult {
    return {updateCount: 0};
  }

  clear(): MockDatabase {
    this.data = [];
    return this;
  }

  private static nextId = 0;
  private static generateId (): string {
    return `id-${MockDatabase.nextId++}`;
  }
  private static jsonClone(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }
}
