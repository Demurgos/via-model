"use strict";
var Bluebird = require("bluebird");
var MockProxy = (function () {
    function MockProxy(db) {
        this.format = "json";
        this.db = db;
    }
    MockProxy.prototype.build = function (schema) {
        return Bluebird.resolve();
    };
    MockProxy.prototype.create = function (data) {
        var _this = this;
        return Bluebird.try(function () {
            return _this.db.create(data);
        });
    };
    MockProxy.prototype.read = function (filter, options) {
        return undefined;
    };
    MockProxy.prototype.readById = function (id, options) {
        return undefined;
    };
    MockProxy.prototype.update = function (filter, update, options) {
        return undefined;
    };
    MockProxy.prototype.updateById = function (id, rev, update, options) {
        return undefined;
    };
    MockProxy.prototype.delete = function () {
        return undefined;
    };
    return MockProxy;
}());
exports.MockProxy = MockProxy;
