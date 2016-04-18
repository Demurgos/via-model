"use strict";
var helpers_1 = require("./helpers");
var PlainModel = (function () {
    function PlainModel(model) {
        helpers_1.defineProperty(this, "_", { value: model });
    }
    return PlainModel;
}());
exports.PlainModel = PlainModel;
