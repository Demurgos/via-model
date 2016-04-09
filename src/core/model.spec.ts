import * as Promise from "bluebird";
import chai from "chai";

import {Model} from "./model";
import {MockDatabase} from "./test/mock-database";
import {MockProxy} from "./test/mock-proxy";

let assert = chai.assert;

describe("Model", function() {
  let db: MockDatabase = new MockDatabase();
  let proxy: MockProxy = new MockProxy(db);

  beforeEach("clear database", function(){
    db.clear();
  });

});
