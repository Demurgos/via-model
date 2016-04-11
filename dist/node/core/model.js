"use strict";
var Promise = require("bluebird");
var _ = require("lodash");
var helpers_1 = require("./helpers");
var objectPath = require("./object-path");
var Model = (function () {
    function Model() {
        this._name = "model";
        this._defaultProxy = null;
        this._schema = null;
        this._ = this;
        this._id = null;
        this._data = {};
        this._oldData = null;
    }
    Model.prototype.setId = function (id) {
        this._id = id;
        this._data._id = id;
        return this;
    };
    Model.prototype.getId = function () {
        return this._id;
    };
    Model.prototype.getToken = function () {
        var id = this.getId();
        return id === null ? null : { _id: id, _name: this._name };
    };
    Model.prototype.getProxy = function (options) {
        if ("proxy" in options && options.proxy) {
            return Promise.resolve(options.proxy);
        }
        else if (this._defaultProxy) {
            return Promise.resolve(this._defaultProxy);
        }
        else {
            return Promise.reject(new Error("Unable to aquire proxy"));
        }
    };
    Model.prototype.exists = function (options) {
        if (this.getId() === null) {
            return Promise.resolve(false);
        }
        else if (options.strict === false) {
            return Promise.resolve(true);
        }
        else {
            // TODO: Support exists
            return this
                .getProxy(options)
                .thenReturn(false);
        }
    };
    Model.prototype.getDefaultData = function (options) {
        var _this = this;
        return Promise.try(function () {
            var date = new Date();
            var data = {
                _id: _this.getId(),
                _rev: "1",
                _type: _this._name,
                _created: date,
                _tested: date
            };
            return data;
        });
    };
    Model.prototype.create = function (options) {
        var _this = this;
        options = _.assign({}, options);
        return this
            .getProxy(options)
            .then(function (proxy) {
            return _this
                .exists({ strict: false, proxy: proxy })
                .then(function (exists) {
                if (exists) {
                    return Promise.reject(new Error("Cannot create, Model already exists"));
                }
                return _this.getDefaultData();
            })
                .then(function (data) {
                data = _.assign(data, _this._data);
                return _this.test(data)
                    .then(function (testResult) {
                    if (testResult !== null) {
                        return Promise.reject(testResult);
                    }
                })
                    .thenReturn(data);
            })
                .then(function (data) {
                return _this.encode(data, proxy.format);
            })
                .then(function (encodedData) {
                // this.check(data)
                delete encodedData._id;
                return proxy.create(encodedData);
            })
                .then(function (response) {
                if (!_.has(response, "_id")) {
                    throw new Error("Unable to create");
                }
                _this.setId(response._id); // TODO: fix type
                return _this.importData(response, proxy.format);
            });
        });
    };
    // Use objectPath ?
    Model.prototype.updateLocal = function (data) {
        this._data = helpers_1.deepMerge(this._data, data, false); // TODO: test with arrays
        return this;
    };
    Model.prototype.updateOneLocal = function (path, value, opt) {
        var _this = this;
        opt = opt || {};
        return Promise.try(function () {
            var parsedPath = objectPath.parse(path);
            objectPath.set(_this._data, path, value);
            // this._updatedProperties.push(<string> parsedPath[0]);
            return _this;
        });
    };
    Model.prototype.readLocal = function (fields) {
        var _this = this;
        var cached = {};
        var missing = [];
        _.forEach(fields, function (field) {
            var parsed = objectPath.parse(field);
            var curPath = [];
            var curValue = _this._data;
            while (parsed.length) {
                var part = parsed.shift();
                curPath.push(part);
                if (_.has(curValue, part)) {
                    curValue = curValue[part];
                }
                else {
                    missing.push(curPath);
                    return true;
                }
            }
            cached[curPath[0]] = _this._data[curPath[0]];
        });
        return { data: cached, missing: missing };
    };
    Model.prototype.clearLocal = function () {
        this._data = { _id: this._id };
        return this;
    };
    Model.prototype.load = function (fields, getProxyOptions) {
        var _this = this;
        // check if updated is empty, warn otherwise
        return this
            .getProxy(getProxyOptions)
            .then(function (proxy) {
            return proxy
                .readById(_this.getId(), { fields: null }) // TODO(Charles): do not read all but fields
                .then(function (data) {
                return _this.importData(data, proxy.format);
            });
        });
    };
    Model.prototype.decode = function (data, format) {
        if (_.isUndefined(format)) {
            format = this
                .getProxy()
                .then(function (proxy) { return proxy.format; });
        }
        return Promise
            .join(this.getSchema(), format, function (schema, format) {
            return schema
                .read(format, data);
        });
    };
    Model.prototype.encode = function (data, format) {
        if (_.isUndefined(format)) {
            format = this
                .getProxy()
                .then(function (proxy) { return proxy.format; });
        }
        return Promise
            .join(this.getSchema(), format, function (schema, format) {
            return schema
                .write(format, data);
        });
    };
    Model.prototype.importData = function (data, format) {
        var _this = this;
        return this
            .decode(data, format)
            .then(function (data) {
            return _this.updateLocal(data);
        });
    };
    Model.prototype.exportData = function (paths, format) {
        var _this = this;
        return this
            .get(paths)
            .then(function (data) {
            return _this.encode(data, format);
        });
    };
    ;
    Model.prototype.diff = function () {
        var _this = this;
        if (this._oldData === null) {
            return Promise.resolve(null);
        }
        return this
            .getSchema()
            .then(function (schema) {
            return schema
                .equals(_this._data, _this._oldData)
                .then(function (equals) {
                if (equals) {
                    return Promise.resolve(null);
                }
                return schema
                    .diff(_this._oldData, _this._data);
            });
        });
    };
    Model.prototype.commit = function (options) {
        var _this = this;
        options = options || {};
        var id = this.getId();
        if (id === null) {
            return Promise.reject(new Error("Object is not created"));
        }
        return Promise
            .join(// TODO: .join<Model> once the definitions is fixed
        this.diff(), this.getProxy(), this.getSchema(), function (diff, proxy, schema) {
            if (diff === null) {
                return Promise.resolve(_this);
            }
            return schema
                .diffToUpdate(_this._data, diff, proxy.format)
                .then(function (encodedUpdateQuery) {
                return proxy.updateById(id, "rev", encodedUpdateQuery); // TODO: track rev
            })
                .then(function (rawResponse) {
                return _this
                    .importData(rawResponse, proxy.format);
            });
        })
            .thenReturn(this);
    };
    Model.prototype.get = function (paths) {
        var _this = this;
        var local = this.readLocal(paths);
        var data = local.data;
        if (local.missing.length === 0) {
            return Promise.resolve(data);
        }
        var parsedMissing = local.missing.map(objectPath.parse);
        return this
            .load(parsedMissing) // TODO: option strict: check if data is loaded
            .then(function () {
            var local = _this.readLocal(paths);
            return helpers_1.deepMerge(data, local.data, false);
        });
    };
    Model.prototype.getOne = function (path) {
        return this
            .get([path])
            .then(function (data) {
            return objectPath.get(data, path);
        });
    };
    Model.prototype.set = function (query, opt) {
        var _this = this;
        opt = opt || {};
        return this
            .test(query, { throwError: true }) // TODO: use throwError option
            .then(function (res) {
            // TODO: remove this test ?
            if (res !== null) {
                return Promise.reject(res);
            }
            return Promise
                .all(_.map(query, function (value, field) {
                return _this.updateOneLocal(objectPath.parse(field), value);
            }));
        })
            .then(function () {
            // TODO: remove this option (commit must be explicitly called)
            return opt.commit ? _this.commit(opt) : Promise.resolve(_this);
        });
    };
    Model.prototype.setOne = function (path, value, opt) {
        var query = {};
        query[objectPath.stringify(path)] = value;
        return this.set(query, opt);
    };
    Model.prototype.getSchema = function () {
        return this._schema !== null ? Promise.resolve(this._schema) : Promise.reject("Schema is not defined !");
    };
    Model.prototype.test = function (query, opt) {
        return this.getSchema()
            .then(function (schema) {
            return schema.test(query); // TODO: add options {allowPartial: true};
        });
    };
    Model.prototype.testOne = function (field, val, opt) {
        var query = {};
        query[objectPath.stringify(field)] = val;
        return this.test(query, opt);
    };
    Model.prototype.ensureValid = function () {
        var _this = this;
        return this.getSchema().then(function (schema) {
            return schema
                .test(_this._data)
                .then(function (res) {
                return res === null;
            });
        })
            .thenReturn(this);
    };
    Model.prototype.toPlain = function (paths, opt) {
        return {};
        // if (fields === null) {
        //   fields = _.keys(self._data);
        // }
        //
        // let model = new Model.Plain(this);
        // return model._load(fields, opt);
    };
    ;
    Model.prototype.toJSON = function () {
        return this.getToken();
    };
    return Model;
}());
exports.Model = Model;
function getNewSync(ctor, opt) {
    opt = _.assign({ data: null }, opt);
    var model = new ctor();
    if (opt.data !== null) {
        model.updateLocal(opt.data);
    }
    return model;
}
exports.getNewSync = getNewSync;
function getNew(ctor, opt) {
    opt = _.assign({ data: null, commit: false }, opt);
    return Promise.try(function () { return getNewSync(ctor, opt); })
        .then(function (model) {
        return opt.commit ? model.commit(opt) : Promise.resolve(model);
    });
}
exports.getNew = getNew;
function getByIdSync(ctor, id, opt) {
    opt = _.assign({ data: null }, opt);
    var model = new ctor({ id: id });
    if (opt.data !== null) {
        model.updateLocal(opt.data);
    }
    return model;
}
exports.getByIdSync = getByIdSync;
function getById(ctor, id, opt) {
    opt = _.assign({ data: null, ensureExists: false }, opt);
    return Promise.try(function () { return getByIdSync(ctor, id, opt); })
        .then(function (model) {
        if (!opt.ensureExists) {
            return Promise.resolve(model);
        }
        return model
            .exists({ strict: true })
            .then(function (res) {
            if (res !== true) {
                throw new Error("modelNotFound: " + id + " not found");
            }
            return model;
        });
    });
}
exports.getById = getById;
function find(ctor, filter, opt) {
    opt = _.defaults(opt || {}, { proxy: null });
    return Promise.resolve(opt.proxy)
        .then(function (proxy) {
        return proxy
            .read(filter)
            .then(function (cursor) {
            return cursor.toArray();
        })
            .map(function (doc, index, length) {
            return getById(ctor, doc._id)
                .then(function (model) { return model.importData(doc, proxy.format); });
        });
    });
}
exports.find = find;
function cast(list, modelsGroup) {
    var res = [];
    for (var i = 0, l = list.length; i < l; i++) {
        var cur = list[i];
        var ctor = modelsGroup.getModelClass(cur._name, true);
        res.push(ctor.getByIdSync(cur._id)); // updateLocal ?
    }
    return res;
}
exports.cast = cast;
// TODO(Charles): fix ?
function castOne(token, modelsGroup) {
    if (token === null) {
        return null;
    }
    var ctor = modelsGroup.getModelClass(token._name, true);
    return getByIdSync(ctor, token._id, {}); // updateLocal ?
}
exports.castOne = castOne;
function generateAccessors(ctor) {
    var tmpCtor = ctor;
    tmpCtor.getNewSync = function (opt) {
        return getNewSync(ctor, opt);
    };
    tmpCtor.getNew = function (options) {
        return getNew(ctor, options);
    };
    tmpCtor.getByIdSync = function (id, opt) {
        return getByIdSync(ctor, id, opt);
    };
    tmpCtor.getById = function (id, opt) {
        return getById(ctor, id, opt);
    };
    tmpCtor.find = function (filter, options) {
        return find(ctor, filter, options);
    };
    return tmpCtor;
}
exports.generateAccessors = generateAccessors;
