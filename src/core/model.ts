import * as Promise from "bluebird";
import * as _ from "lodash";

import {deepMerge} from "./helpers";
import * as objectPath from "./object-path";
import {ModelToken, Query} from "./interfaces";
import {Proxy, ViaSchema, Dictionary} from "via-core";
import {IModel, StaticModel, FindOptions} from "./interfaces";
import {GetProxyOptions, ExistsOptions, CommitOptions, LoadOptions} from "./interfaces";
import {Cursor} from "~via-core/dist/node/core/interfaces/proxy";

export class Model implements IModel {
  public _name: "model";
  public _: Model; // self-reference

  private _id: string;
  private _data: any;
  private _changes: any;
  private _updatedProperties: string[];
  private _defaultProxy: Proxy;
  private _schema: ViaSchema;

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
      // TODO: Support exists
      return this
        .getProxy(options)
        // .call("exists", this.getId())
        .thenReturn(false);
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

  create (options?: any): Promise<Model> {
    options = _.assign({}, options);

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

            this.setId((<any> response)._id); // TODO: fix type
            return this.importData(response, proxy.format);
          });
      });
  }

  updateLocal (data: Dictionary<any>): Model {
    this._data = deepMerge(this._data, data, false); // TODO: test with arrays
    return this;
  }

  readLocal (fields: objectPath.ObjectPath[]) {
    let cached: any = {};
    let missing: objectPath.ObjectPath[] = [];

    _.forEach(fields, (field) => {
      let parsed: objectPath.ObjectPath = objectPath.parse(field);
      let curPath: objectPath.ObjectPath = [];
      let curValue: any = this._data;

      while (parsed.length) {
        let part: string|number = parsed.shift();
        curPath.push(part);
        if (_.has(curValue, part)) {
          curValue = curValue[part];
        } else {
          missing.push(curPath);
          return true;
        }
      }

      cached[curPath[0]] = this._data[curPath[0]];
    });

    return {data: cached, missing: missing};
  }

  clearLocal () {
    this._data = {_id: this._id};
    return this;
  }

  load (fields: objectPath.ObjectPath[], getProxyOptions?: LoadOptions) {
    // check if updated is empty, warn otherwise
    return this
      .getProxy(getProxyOptions)
      .then((proxy) => {
        return proxy
          .readById(this.getId(), {fields: null}) // TODO(Charles): do not read all but fields
          .then((data: Object) => {
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
      .join<any> (
        this.getSchema(),
        format,
        (schema: ViaSchema, format: string) => {
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
      .join<any> (
        this.getSchema(),
        format,
        (schema: ViaSchema, format: string) => {
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
  commit (options?: CommitOptions): Promise<Model> {
    options = options || {};

    if (!this._updatedProperties.length) {
      return Promise.resolve(this);
    }

    let id = this.getId();
    if (id === null) {
      return Promise.reject(new Error("Object is not created"));
    }

    let query: Dictionary<any> = {};
    _.each(this._updatedProperties, (item: string) => {
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
            return proxy.updateById(id, "rev", rawQuery); // TODO: track rev
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

    let parsedMissing: objectPath.ObjectPath[] = local.missing.map(objectPath.parse);

    return this
      .load(parsedMissing) // TODO: option strict: check if data is loaded
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

  prepare (path: objectPath.ObjectPath, value: any, opt?: any): Promise<Model> {
    opt = opt || {};

    return Promise.try(() => {
      let parsedPath = objectPath.parse(<any> path); // utils.field.parse(field);

      objectPath.set(this._changes, path, value);
      this._updatedProperties.push(<string> parsedPath[0]);
      return this;
    });
  }

  set (query: Query, opt?: any) {
    opt = opt || {};
    return this
      .test(query, {throwError: true}) // TODO: use throwError option
      .then((res: Error) => {
        return Promise
          .all(
            _.map(query, (value: any, field: string) => {
              return this.prepare(objectPath.parse(field), value);
            })
          );
      })
      .then(() => {
        // TODO: remove this option (commit must be explicitly called)
        return opt.commit ? this.commit(opt) : this;
      });
  }

  setOne (path: objectPath.ObjectPath, value: any, opt?: any) {
    let query: Dictionary<any> = {};
    query[objectPath.stringify(path)] = value;
    return this.set(query, opt);
  }

  getSchema (): Promise<ViaSchema> {
    return Promise.resolve(this._schema);
  }

  test (query: any, opt?: any): Promise<Error> {
    return this.getSchema()
      .then((schema: ViaSchema) => {
        return schema.test(query); // TODO: add options {allowPartial: true};
      });
  }

  testOne (field: objectPath.ObjectPath, val: any, opt?: any) {
    var query: Dictionary<any> = {};
    query[objectPath.stringify(field)] = val;

    return this.test(query, opt);
  }

  ensureValid (): Promise<Model> {
    return this.getSchema().then((schema: ViaSchema) => {
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

  toJSON (): ModelToken {
    return this.getToken();
  }
}

let _models: Dictionary<StaticModel> = {};

export function getStaticModel (model: string | StaticModel, ensureExists: boolean): StaticModel {
  let res: StaticModel = null;
  if (_.isString(model)) {
    res = _models[model] || null;
  } else {
    // TODO: check if it is really a StaticModel
    res = <StaticModel> model;
  }

  if (ensureExists && res === null) {
    throw new Error("unknownModel");
    // throw new _Error("unknownModel", {name: name}, `Unknown model name ${name}`);
  }
  return res;
}

export function setModelClass (name: string, ctor: StaticModel, opt?: any): StaticModel {
  opt = _.assign({}, opt);

  // Model.generateAccessors(ctor)
  return _models[name] = ctor;
};

export function getNewSync (ctor: StaticModel, opt?: any): Model {
  opt = _.assign({data: null}, opt);

  let model: IModel = new ctor();

  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }

  // TODO(Charles): remove <any>
  return <any> model
};

export function getNew (ctor: StaticModel, opt?: any): Promise<Model> {
  opt = _.assign({data: null, commit: false}, opt);

  return Promise.try(<any> getNewSync, [ctor, opt])
    .then((model: Model) => {
      return opt.commit ? model.commit(opt) : model;
    });
}

export function getByIdSync (ctor: StaticModel, id: string, opt?: any): Model {
  opt = _.assign({data: null}, opt);

  let model = new ctor({id: id});
  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }
  return model;
}

export function getById (ctor: StaticModel, id: string, opt?: any): Promise<Model> {
  opt = _.assign({data: null, ensureExists: false}, opt)

  return Promise.try(<any> getByIdSync, [ctor, id, opt])
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
    });
}

export function find (ctor: StaticModel, filter: Object, opt?: FindOptions): Promise<Model[]> {
  opt = _.defaults(opt || {}, {proxy: null});

return Promise.resolve(opt.proxy)
  .then((proxy: Proxy) => {
    return proxy
      .read(filter)
      .then((cursor: Cursor) => {
        return cursor.toArray();
      })
      .map((doc: any, index: number, length: number) => {
        return getStaticModel(doc._name, true)
          .getByIdSync(doc._id)
          .importData(doc, proxy.format)
      });
  });
}

export function cast(list: any[]): Model[] {
  let res: Model[] = [];
  for(let i = 0, l = list.length; i<l; i++){
    let cur = list[i];
    let ctor = getStaticModel(cur._name, true);
    res.push(ctor.getByIdSync(cur._id)); // updateLocal ?
  }
  return res;
}

// TODO(Charles): fix ?
export function castOne(token: ModelToken): any {
  if (token === null) {
    return null;
  }
  let ctor = getStaticModel(token._name, true);
  return getByIdSync(ctor, token._id, {}); // updateLocal ?
}

export function generateAccessors (ctor: StaticModel) {
  ctor.getNewSync = function(opt){
    return getNewSync(ctor, opt)
  };

  ctor.getNew = function(options?: any) {
    return getNew(ctor, options);
  };

  ctor.getByIdSync = function(id, opt){
    return getByIdSync(ctor, id, opt);
  };

  ctor.getById = function(id, opt){
    return getById(ctor, id, opt);
  };

  ctor.find = function(filter: Object, options?: FindOptions){
    return find(ctor, filter, options);
  };
}
