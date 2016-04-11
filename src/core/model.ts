import * as Promise from "bluebird";
import * as _ from "lodash";

import {deepMerge} from "./helpers";
import * as objectPath from "./object-path";
import {ModelToken, Query, ModelConstructor} from "./interfaces";
import {Proxy, ViaSchema, Dictionary} from "via-core";
import {IModel, StaticModel, FindOptions} from "./interfaces";
import {GetProxyOptions, ExistsOptions, CommitOptions, LoadOptions, ReadLocalResult} from "./interfaces";
import {Cursor, DocumentDiff, UpdateQuery} from "via-core";
import {ModelsGroup} from "./models-group";

export class Model implements IModel {
  public _name: string = "model";
  public _: Model; // self-reference

  protected _id: string;
  protected _data: any;
  protected _oldData: any;
  protected _defaultProxy: Proxy = null;
  protected _schema: ViaSchema = null;

  constructor () {
    this._ = this;

    this._id = null;
    this._data = {};
    this._oldData = null;
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
        _type: this._name
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
            return this.test(data)
              .then((testResult: Error) => {
                if (testResult !== null) {
                  return Promise.reject(testResult);
                }
              })
              .thenReturn(data);
          })
          .then((data) => {
            return this.encode(data, proxy.format);
          })
          .then((encodedData) => {
            // this.check(data)
            delete encodedData._id;
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

  // Use objectPath ?
  updateLocal (data: Dictionary<any>): Model {
    this._data = deepMerge(this._data, data, false); // TODO: test with arrays
    return this;
  }

  updateOneLocal (path: objectPath.ObjectPath, value: any, opt?: any): Promise<Model> {
    opt = opt || {};

    return Promise.try(() => {
      let parsedPath = objectPath.parse(<any> path);
      objectPath.set(this._data, path, value);
      // this._updatedProperties.push(<string> parsedPath[0]);
      return this;
    });
  }

  readLocal (fields: objectPath.ObjectPath[]): ReadLocalResult {
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
            .read(format, data);
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
            .write(format, data);
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

  diff(): Promise<DocumentDiff> {
    if (this._oldData === null) {
      return Promise.resolve(<DocumentDiff> null);
    }

    return this
      .getSchema()
      .then((schema: ViaSchema) => {
        return schema
          .equals(this._data, this._oldData)
          .then((equals: boolean) => {
            if (equals) {
              return Promise.resolve(<DocumentDiff> null);
            }
            return schema
              .diff(this._oldData, this._data);
          });
      })
  }

  commit (options?: CommitOptions): Promise<Model> {
    options = options || {};

    let id = this.getId();
    if (id === null) {
      return Promise.reject(new Error("Object is not created"));
    }

    return Promise
      .join<any>( // TODO: .join<Model> once the definitions is fixed
        this.diff(),
        this.getProxy(),
        this.getSchema(),
        (diff: DocumentDiff, proxy:Proxy, schema:ViaSchema) => {
          if (diff === null) {
            return Promise.resolve(this);
          }
          return schema
            .diffToUpdate(this._data, diff, proxy.format)
            .then((encodedUpdateQuery:UpdateQuery) => {
              return proxy.updateById(id, "rev", encodedUpdateQuery); // TODO: track rev
            })
            .then((rawResponse) => {
              return this
                .importData(rawResponse, proxy.format)
            });
        }
      )
      .thenReturn(this);
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

  set (query: Query, opt?: any): Promise<Model> {
    opt = opt || {};
    return this
      .test(query, {throwError: true}) // TODO: use throwError option
      .then((res: Error) => {
        // TODO: remove this test ?
        if (res !== null) {
          return Promise.reject(res);
        }

        return Promise
          .all(
            _.map(query, (value: any, field: string) => {
              return this.updateOneLocal(objectPath.parse(field), value);
            })
          );
      })
      .then(() => {
        // TODO: remove this option (commit must be explicitly called)
        return opt.commit ? this.commit(opt) : Promise.resolve(this);
      });
  }

  setOne (path: objectPath.ObjectPath, value: any, opt?: any): Promise<Model> {
    let query: Dictionary<any> = {};
    query[objectPath.stringify(path)] = value;
    return this.set(query, opt);
  }

  getSchema (): Promise<ViaSchema> {
    return this._schema !== null ? Promise.resolve(this._schema) : Promise.reject("Schema is not defined !");
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

export function getNewSync (ctor: ModelConstructor, opt?: any): Model {
  opt = _.assign({data: null}, opt);

  let model: Model = new ctor();

  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }

  return model
}

export function getNew (ctor: ModelConstructor, opt?: any): Promise<Model> {
  opt = _.assign({data: null, commit: false}, opt);

  return Promise.try(() => getNewSync(ctor, opt))
    .then((model: Model) => {
      return opt.commit ? model.commit(opt) : Promise.resolve(model);
    });
}

export function getByIdSync (ctor: ModelConstructor, id: string, opt?: any): Model {
  opt = _.assign({data: null}, opt);

  let model = new ctor({id: id});
  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }
  return model;
}

export function getById (ctor: ModelConstructor, id: string, opt?: any): Promise<Model> {
  opt = _.assign({data: null, ensureExists: false}, opt)
  
  return Promise.try(() => getByIdSync(ctor, id, opt))
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

export function find (ctor: ModelConstructor, filter: Object, opt?: FindOptions): Promise<Model[]> {
  opt = _.defaults(opt || {}, {proxy: null});

return Promise.resolve(opt.proxy)
  .then((proxy: Proxy) => {
    return proxy
      .read(filter)
      .then((cursor: Cursor) => {
        return cursor.toArray();
      })
      .map((doc: any, index: number, length: number) => {
        return getById(ctor, doc._id)
          .then(model => model.importData(doc, proxy.format));
      });
  });
}

export function cast(list: any[], modelsGroup: ModelsGroup): Model[] {
  let res: Model[] = [];
  for(let i = 0, l = list.length; i<l; i++){
    let cur = list[i];
    let ctor = modelsGroup.getModelClass(cur._name, true);
    res.push(ctor.getByIdSync(cur._id)); // updateLocal ?
  }
  return res;
}

// TODO(Charles): fix ?
export function castOne(token: ModelToken, modelsGroup: ModelsGroup): any {
  if (token === null) {
    return null;
  }
  let ctor = modelsGroup.getModelClass(token._name, true);
  return getByIdSync(ctor, token._id, {}); // updateLocal ?
}

export function generateAccessors (ctor: ModelConstructor): StaticModel {
  let tmpCtor = <StaticModel> ctor;
  tmpCtor.getNewSync = function(opt){
    return getNewSync(ctor, opt)
  };

  tmpCtor.getNew = function(options?: any) {
    return getNew(ctor, options);
  };

  tmpCtor.getByIdSync = function(id, opt){
    return getByIdSync(ctor, id, opt);
  };

  tmpCtor.getById = function(id, opt){
    return getById(ctor, id, opt);
  };

  tmpCtor.find = function(filter: Object, options?: FindOptions){
    return find(ctor, filter, options);
  };

  return tmpCtor;
}
