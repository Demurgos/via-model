import * as Bluebird from "bluebird";
import {assert} from "chai";

import {Model, generateAccessors} from "./model";
import {MockDatabase} from "./test/mock-database";
import {MockProxy} from "./test/mock-proxy";
import {model} from "via-core";

class TestModel extends Model {
  constructor() {
    super();
    this._name = "test-model";
    this._schema = null;
  }

  getDefaultData (options?: any): Bluebird<any> {
    return super
      .getDefaultData()
      .then((data: any) => {
        data.testField = "testValue";
        return data;
      });
  }

  static getNewSync (opt?: any): TestModel {return null;}
  static getNew (opt?: any): Bluebird<TestModel> {return null;}
  static getByIdSync (id: string, opt?: any): TestModel {return null;}
  static getById (id: string, opt?: any): Bluebird<TestModel> {return null;}
  static find (filter: Object, opt?: model.FindOptions): Bluebird<TestModel[]> {return null;}
}

describe("Model", function() {
  let db: MockDatabase = new MockDatabase();
  let proxy: MockProxy = new MockProxy(db);

  beforeEach("clear database", function(){
    db.clear();
  });

  let testType = function () {
    let testModel = new TestModel();
    testModel.exportData(["_id"], "json");
  }
});
