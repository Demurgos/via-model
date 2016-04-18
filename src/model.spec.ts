import * as Promise from "bluebird";
import {assert} from "chai";

import {Model} from "./model";
import {MockDatabase} from "./test/mock-database";
import {MockProxy} from "./test/mock-proxy";

describe("Model", function() {
  let db: MockDatabase = new MockDatabase();
  let proxy: MockProxy = new MockProxy(db);

  beforeEach("clear database", function(){
    db.clear();
  });

});
