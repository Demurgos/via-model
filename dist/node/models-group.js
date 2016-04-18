"use strict";
var _ = require("lodash");
var ModelsGroup = (function () {
    function ModelsGroup() {
        this._modelClasses = {};
    }
    ModelsGroup.prototype.getModelClass = function (model, ensureExists) {
        var res = null;
        if (_.isString(model)) {
            res = this._modelClasses[model] || null;
        }
        else {
            // TODO: check if it is really a StaticModel
            res = model;
        }
        if (ensureExists !== false && res === null) {
            throw new Error("unknownModel");
        }
        return res;
    };
    ModelsGroup.prototype.setModelClass = function (name, ctor, opt) {
        opt = _.assign({}, opt);
        // Model.generateAccessors(ctor)
        return this._modelClasses[name] = ctor;
    };
    return ModelsGroup;
}());
exports.ModelsGroup = ModelsGroup;
