"use strict";
var MockDatabase = (function () {
    function MockDatabase() {
    }
    MockDatabase.prototype.create = function (doc) {
        var jsonDoc = MockDatabase.jsonClone(doc);
        jsonDoc._id = MockDatabase.generateId();
        this.data.push(jsonDoc);
        return MockDatabase.jsonClone(jsonDoc);
    };
    MockDatabase.prototype.read = function () {
        var data = MockDatabase.jsonClone(this.data);
        return {
            toArray: function () {
                return data;
            }
        };
    };
    MockDatabase.prototype.update = function () {
        return { updateCount: 0 };
    };
    MockDatabase.prototype.clear = function () {
        this.data = [];
        return this;
    };
    MockDatabase.generateId = function () {
        return "id-" + MockDatabase.nextId++;
    };
    MockDatabase.jsonClone = function (data) {
        return JSON.parse(JSON.stringify(data));
    };
    MockDatabase.nextId = 0;
    return MockDatabase;
}());
exports.MockDatabase = MockDatabase;
