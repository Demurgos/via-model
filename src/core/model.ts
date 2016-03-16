import * as Promise from "bluebird";
import * as _ from "lodash";

import {IntegerType} from "via-type";

import {Proxy} from "./proxy";
import {deepMerge} from "./helpers";
import * as objectPath from "./object-path";
import {ModelToken, Query} from "./interfaces";
import {DocumentType} from "via-type/dist/node/core/document";


interface GetProxyOptions {
  proxy?: Proxy;
}

interface ExistsOptions extends GetProxyOptions {
  strict: boolean;
}

export class Model {
  public _id: string;
  public _name: "model";
  public _: Model; // self-reference

  private _data: any;
  private _changes: any;
  private _updatedProperties: string[];
  private _defaultProxy: Proxy;
  private _schema: DocumentType;

  constructor () {
    this._ = this;
    this._data = {};
    this._changes = {};
    this._updatedProperties = [];

    this._id = null;
  }

  setId (id: string): Model {
    this._id = id;
    this._data._id = id;
    return this
  }

  getId (): string {
    return this._id;
  }

  getToken (): ModelToken {
    let id = this.getId();
    return id === null ? null : {_id: id, _name: this._name};
  }

  getProxy (options?: GetProxyOptions): Promise<Proxy> {
    if ("proxy" in options && options.proxy) {
      return Promise.resolve(options.proxy);
    } else if (this._defaultProxy) {
      return Promise.resolve(this._defaultProxy);
    } else {
      return Promise.reject(new Error("Unable to aquire proxy"));
    }
  }

  exists (options: ExistsOptions): Promise<boolean> {
    if (this.getId() === null) {
      return Promise.resolve(false);
    } else if (options.strict === false) {
      return Promise.resolve(true);
    } else {
      return options.proxy.exists(this.getId());
    }
  }

  getDefaultData (options?: any): Promise<any> {
    return Promise.try(() => {
      let date = new Date();
      let data = {
        _id: this.getId(),
        _rev: date,
        _created: date,
        _tested: date
      };
      return data;
    });
  }

  create (options?: any) {
    let options = _.assign({}, options);

    return this
      .getProxy(options)
      .then((proxy: Proxy) => {
        return this
          .exists({strict: false, proxy: proxy})
          .then((exists) => {
            if (exists) {
              return Promise.reject(new Error("Cannot create, Model already exists"));
            }
            return this.getDefaultData();
          })
          .then((data) => {
            data = _.assign(data, this._data);
            return this.test(data).thenReturn(data);
          })
          .then((data) => {
            return this.encode(data, proxy.format);
          })
          .then((encodedData) => {
            // this.check(data)
            return proxy.create(encodedData);
          })
          .then((response) => {
            if(!_.has(response, "_id")){ //returns object: should be the response
              throw new Error("Unable to create");
            }

            this.setId(response._id);
            return this.importData(response, proxy.format);
          });
      });
  }

  updateLocal (data) {
    this._data = deepMerge(this._data, data, false); // TODO: test with arrays
    return this;
  }

  readLocal (fields) {
    let cached: any = {};
    let missing: string[] = [];
    // recursivity
    _.forEach(fields, (field) => {
      var parsed = objectPath.parse(field);
      if (!parsed.length) {
        return true; // continue
      }
      let done = [];
      let cur = this._data;

      while (parsed.length) {
        var part = parsed.shift();
        done.push(part);
        if (_.has(cur, part)) {
          cur = cur[part];
        }else{
          missing.push(objectPath.stringify(done));
          return true;
        }
      }

      cached[done[0]] = self._data[done[0]];
    });

    return {data: cached, missing: missing};
  }

  clearLocal () {
    this._data = {_id: this._id};
    return this;
  }

  load (fields, getProxyOptions?: GetProxyOptions) {
    // check if updated is empty, warn otherwise
    return this
      .getProxy(getProxyOptions)
      .then((proxy) => {
        return proxy
          .get(this.getId(), fields)
          .then((data) => {
            return this.importData(data, proxy.format);
          });
      })
  }

  decode (data: any, format: string | Promise<string>): Promise<any> {
    if (_.isUndefined(format)) {
      format = this
        .getProxy()
        .then<string>((proxy: Proxy) => proxy.format);
    }

    return Promise
      .join(
        this.getSchema(),
        format,
        function(schema, format){
          return schema
            .read(data, format);
        }
      );
  }

  encode (data: any, format: string | Promise<string>): Promise<any> {
    if (_.isUndefined(format)) {
      format = this
        .getProxy()
        .then<string>((proxy: Proxy) => proxy.format);
    }

    return Promise
      .join(
        this.getSchema(),
        format,
        (schema, format) => {
          return schema
            .write(data, format);
        }
      );
  }

  importData (data: any, format: string): Promise<Model> {
    return this
      .decode(data, format)
      .then((data) => {
        return this.updateLocal(data);
      });
  }

  exportData (paths: objectPath.ObjectPath[], format: string): Promise<any> {
    return this
      .get(paths)
      .then((data) => {
        return this.encode(data, format);
      });
  };

  //do not empty _write & _updated ?
  commit (opt) {
    opt = opt || {};

    if (opt.local || !this._updatedProperties.length) {
      return this; // hum ?
      /*return self
        .readData(self._write)
        .thenResolve(self);*/}

    let id = this.getId();
    if (id === null) {
      return Promise.reject(new Error("Object is not created"));
    }

    let query = {};
    _.each(this._updatedProperties, (item) => {
      query[item] = this._changes[item];
    });

    this._changes = {};
    this._updatedProperties = [];

    return this
      .getProxy()
      .then((proxy: Proxy) => {
        return this
          .encode(query, proxy.format)
          .then((rawQuery) => {
            return proxy.set(id, rawQuery)
          })
          .then((rawResponse) => {
            return this
              .importData(rawResponse, proxy.format)
          });
      });
  }

  get (paths: objectPath.ObjectPath[]): Promise<any> {
    let local = this.readLocal(paths);
    let data = local.data;

    if (local.missing.length === 0) {
      return Promise.resolve(data);
    }

    return this
      .load(local.missing) // TODO: option strict: check if data is loaded
      .then(() => {
        let local = this.readLocal(paths);
        return deepMerge(data, local.data, false);
      });
  }

  getOne (path: objectPath.ObjectPath): Promise<any> {
    return this
      .get([path])
      .then((data) => {
        return objectPath.get(data, path);
      });
  }

  prepare (path: objectPath.ObjectPath, value, opt?: any): Promise<Model> {
    opt = opt || {};

    return Promise.try(() => {
      let parsedPath = path; // utils.field.parse(field);

      // if (!(path && path.length)) {
      //   return Promise.reject(new Error("Cannot parse field path in Model:prepare, field="+field))
      // }

      objectPath.set(this._changes, path, value);
      this._updatedProperties.push(path[0]);
      return this;
    })
  }

  set (query: Query, opt?: any) {
    opt = opt || {};
    return this
      .test(query, {throwError: true}) // TODO: throwError option
      .then((res: Error) => {
        return Promise
          .all(
            _.map(query, (value, field) => {
              return self.prepare(field, value);
            })
          )
      })
      .then(() => {
        // TODO: remove this option (commit must be explicitly called)
        return opt.commit ? this.commit(opt) : this;
      });
  }

  setOne (path: objectPath.ObjectPath, value: any, opt?: any) {
    let query = {};
    query[objectPath.stringify(path)] = value;
    return this.set(query, opt);
  }

  getSchema (): Promise<DocumentType> {
    return Promise.resolve(null);
  }

  test (query: any, opt?: any): any {
    return this.getSchema()
      .call("test", query, {allowPartial: true});
  }

  testOne (field, val, opt) {
    var query = {};
    query[field] = val;

    return this.test(query, opt);
  }

  ensureValid (): Promise<Model> {
    return this.getSchema().then((schema: DocumentType) => {
      return schema
        .test(this._data)
        .then(res => {
          return res === null;
        });
    })
    .thenReturn(this);
  }


  toPlain (paths: objectPath.ObjectPath[], opt?: any): any {
    return {};
    // if (fields === null) {
    //   fields = _.keys(self._data);
    // }
    //
    // let model = new Model.Plain(this);
    // return model._load(fields, opt);
  };

  toJSON () {
    return this.getToken();
  }

  static _models: {[name: string]: Model} = {};

  static getModelClass (name, ensureExists) {
    // TODO fix: name should be a constructor, not an instance!
    // let model = name instanceof Model ? name : (Model._models[name] || null);
    let staticModel: any;
    if (_.isString(name)) {
      staticModel = Model._models[name] || null;
    } else {
      name = name._name;
    }

    if (ensureExists && staticModel === null) {
      throw new Error("unknownModel");
      // throw new _Error("unknownModel", {name: name}, `Unknown model name ${name}`);
    }

    return staticModel;
  }

  static setModelClass (name: string, ctor: any, opt): any {
    opt = _.assign({}, opt);

    // Model.generateAccessors(ctor)
    return Model._models[name] = ctor;
  };

  static getNewSync (ctor: any, opt?: any): Model {
    opt = _.assign({data: null}, opt);

    let model = new ctor(null);

    if (opt.data !== null) {
      model.updateLocal(opt.data);
    }

    return model
  };

  static getNew (ctor, opt): Promise<Model> {
    opt = _.assign({data: null, save: false}, opt);

    return Promise.try(<Function> Model.getNewSync, [ctor, opt])
      .then((model: Model) => {
        return opt.commit ? model.commit(opt) : model;
      });
  }

  static getByIdSync (ctor, id, opt): Model {
    opt = _.assign({data: null}, opt);

    let model = new ctor(id);
    if (opt.data !== null) {
      model.updateLocal(opt.data);
    }
    return model;
  }

  static getById (ctor, id, opt): Promise<Model> {
    opt = _.assign({data: null, ensureExists: false}, opt)

    return Promise.try(<Function> Model.getByIdSync, [ctor, id, opt])
      .then((model: Model) => {
        if (!opt.ensureExists) {
          return Promise.resolve(model);
        }
        return model
          .exists({strict: true})
          .then(function(res){
            if (res !== true){
              throw new Error("modelNotFound: "+id+" not found");
            }
            return model;
          })
      })
  }

  static find (ctor, selector, fields, opt): Promise<Model[]> {
    opt = _.defaults(opt || {}, {proxy: null});

    return ctor
      .getProxy(opt.proxy)
      .then(function(proxy){
        return proxy
          .find(selector, fields)
          .map(function(cur, i, l){
            return Model
              .getModelClass(cur._name, true)
              .getByIdSync(cur._id)
              .importData(cur, proxy.format)
          });
      });
  }

  static cast(list: any[]): Model[] {
    let res: Model[] = [];
    for(let i = 0, l = list.length; i<l; i++){
      let cur = list[i];
      let ctor = Model.getModelClass(cur._name, true);
      res.push(ctor.getByIdSync(cur._id)); // updateLocal ?
    }
    return res;
  }

  // TODO(Charles): fix ?
  static castOne(token: ModelToken): any {
    if (token === null) {
      return null;
    }
    let ctor = Model.getModelClass(token._name, true);
    return Model.getByIdSync(ctor, token._id, {}); // updateLocal ?
  }
}

export function generateAccessors (ctor) {
  ctor.getNewSync = function(opt){
    return Model.getNewSync(ctor, opt)
  };

  ctor.getNew = function(opt){
    return Model.getNew(ctor, opt)
  };

  ctor.getByIdSync = function(id, opt){
    return Model.getByIdSync(ctor, id, opt)
  };

  ctor.getById = function(id, opt){
    return Model.getById(ctor, id, opt)
  };

  ctor.find = function(selector, fields, opt){
    return Model.find(ctor, selector, fields, opt)
  };
}
