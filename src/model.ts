import * as Bluebird from "bluebird";
import * as _ from "lodash";

import {model, proxy, schema, utils, dotPath, type} from "via-core";

import {deepMerge} from "./helpers";
import {ModelsGroup} from "./models-group";
import {ModelConstructor} from "./interfaces/model-constructor";
import {StaticModel} from "./interfaces/static-model";

export class Model implements model.Model {
  public _: Model; // self-reference

  protected _name: string = "via-model";
  protected _id: string;
  protected _data: any;
  protected _oldData: any;
  protected _defaultProxy: proxy.Proxy = null;
  protected _schema: schema.ViaModelSchema = null;

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

  getName (): string {
    return this._name;
  }

  getToken (): model.ModelToken {
    let id = this.getId();
    return id === null ? null : {_id: id, _name: this._name};
  }

  getProxy (options?: model.GetProxyOptions): Bluebird<proxy.Proxy> {
    if ("proxy" in options && options.proxy) {
      return Bluebird.resolve(options.proxy);
    } else if (this._defaultProxy) {
      return Bluebird.resolve(this._defaultProxy);
    } else {
      return Bluebird.reject(new Error("Unable to aquire proxy"));
    }
  }

  exists (options: model.ExistsOptions): Bluebird<boolean> {
    if (this.getId() === null) {
      return Bluebird.resolve(false);
    } else if (options.strict === false) {
      return Bluebird.resolve(true);
    } else {
      // TODO: Support exists
      return this
        .getProxy(options)
        // .call("exists", this.getId())
        .thenReturn(false);
    }
  }

  getDefaultData (options?: any): Bluebird<any> {
    return Bluebird.try(() => {
      let data = {
        _name: this._name
      };
      return data;
    });
  }

  create (options?: any): Bluebird<Model> {
    options = _.assign({}, options);

    return this
      .getProxy(options)
      .then((proxy: proxy.Proxy) => {
        return this
          .exists({strict: false, proxy: proxy})
          .then((exists) => {
            if (exists) {
              return Bluebird.reject(new Error("Cannot create, Model already exists"));
            }
            return this.getDefaultData();
          })
          .then((data) => {
            data = _.assign(data, this._data);
            return this.test(data, {properties: {_id: null}})
              .then((testResult: Error) => {
                if (testResult !== null) {
                  return Bluebird.reject(testResult);
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
  updateLocal (data: utils.Document): Model {
    this._data = deepMerge(this._data, data, false); // TODO: test with arrays
    return this;
  }

  updateOneLocal (path: dotPath.DotPath, value: any, opt?: any): Bluebird<Model> {
    opt = opt || {};

    return Bluebird.try(() => {
      dotPath.set(this._data, path, value);
      return this;
    });
  }

  readLocal (fields: dotPath.DotPath[]): model.ReadLocalResult {
    let cached: any = {};
    let missing: dotPath.DotPath[] = [];

    _.forEach(fields, (field) => {
      let parsed: dotPath.ParsedDotPath = dotPath.parse(field);
      let curPath: dotPath.ParsedDotPath = [];
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

  load (fields: dotPath.DotPath[], getProxyOptions?: model.LoadOptions) {
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

  decode (data: any, format: string | Bluebird<string>): Bluebird<any> {
    if (_.isUndefined(format)) {
      format = this
        .getProxy()
        .then<string>((proxy: proxy.Proxy) => proxy.format);
    }

    return Bluebird
      .join(
        this.getSchema(),
        format,
        (schema: schema.ViaModelSchema, format: string) => {
          return schema
            .read(format, data, {allowPartial: true});
        }
      );
  }

  encode (data: any, format: string | Bluebird<string>): Bluebird<any> {
    if (_.isUndefined(format)) {
      format = this
        .getProxy()
        .then<string>((proxy: proxy.Proxy) => proxy.format);
    }

    return Bluebird
      .join(
        this.getSchema(),
        format,
        (schema: schema.ViaModelSchema, format: string) => {
          return schema
            .write(format, data);
        }
      );
  }

  importData (data: any, format: string): Bluebird<Model> {
    return this
      .decode(data, format)
      .then((data) => {
        return this.updateLocal(data);
      });
  }

  exportData (paths: dotPath.DotPath[], format: string): Bluebird<any> {
    return this
      .get(paths)
      .then((data) => {
        return this.encode(data, format);
      });
  };

  diff(): Bluebird<type.DocumentDiff> {
    if (this._oldData === null) {
      return Bluebird.resolve(<type.DocumentDiff> null);
    }

    return this
      .getSchema()
      .then((schema: schema.ViaModelSchema) => {
        return schema
          .equals(this._data, this._oldData)
          .then((equals: boolean) => {
            if (equals) {
              return Bluebird.resolve(<type.DocumentDiff> null);
            }
            return schema
              .diff(this._oldData, this._data);
          });
      })
  }

  commit (options?: model.CommitOptions): Bluebird<Model> {
    options = options || {};

    let id = this.getId();
    if (id === null) {
      return Bluebird.reject(new Error("Object is not created"));
    }

    return Bluebird
      .join(
        this.diff(),
        this.getProxy(),
        this.getSchema(),
        (diff: type.DocumentDiff, proxy: proxy.Proxy, schema: schema.ViaModelSchema) => {
          if (diff === null) {
            return Bluebird.resolve(this);
          }
          return schema
            .diffToUpdate(this._data, diff, proxy.format)
            .then((encodedUpdateQuery: type.UpdateQuery) => {
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

  get (paths: dotPath.DotPath[]): Bluebird<any> {
    let local = this.readLocal(paths);
    let data = local.data;

    if (local.missing.length === 0) {
      return Bluebird.resolve(data);
    }

    let parsedMissing: dotPath.ParsedDotPath[] = local.missing.map(dotPath.parse);

    return this
      .load(parsedMissing) // TODO: option strict: check if data is loaded
      .then(() => {
        let local = this.readLocal(paths);
        return deepMerge(data, local.data, false);
      });
  }

  getOne (path: dotPath.DotPath): Bluebird<any> {
    return this
      .get([path])
      .then((data) => {
        return dotPath.get(data, path);
      });
  }

  set (query: utils.Document, opt?: any): Bluebird<Model> {
    opt = opt || {};
    return this
      .test(query, {throwError: true}) // TODO: use throwError option
      .then((res: Error) => {
        // TODO: remove this test ?
        if (res !== null) {
          return Bluebird.reject(res);
        }

        return Bluebird
          .all(
            _.map(query, (value: any, field: string) => {
              return this.updateOneLocal(dotPath.parse(field), value);
            })
          );
      })
      .then(() => {
        // TODO: remove this option (commit must be explicitly called)
        return opt.commit ? this.commit(opt) : Bluebird.resolve(this);
      });
  }

  setOne (path: dotPath.DotPath, value: any, opt?: any): Bluebird<Model> {
    let query: utils.Document = {};
    query[dotPath.stringify(path)] = value;
    return this.set(query, opt);
  }

  getSchema (): Bluebird<schema.ViaModelSchema> {
    return this._schema !== null ? Bluebird.resolve(this._schema) : Bluebird.reject("Schema is not defined !");
  }

  test (query: any, opt?: any): Bluebird<Error> {
    return this.getSchema()
      .then((schema: schema.ViaModelSchema) => {
        return schema.test(query); // TODO: add options {allowPartial: true};
      });
  }

  testOne (field: dotPath.DotPath, val: any, opt?: any) {
    var query: utils.Document = {};
    query[dotPath.stringify(field)] = val;

    return this.test(query, opt);
  }

  ensureValid (): Bluebird<Model> {
    return this.getSchema().then((schema: schema.ViaModelSchema) => {
      return schema
        .test(this._data)
        .then(res => {
          return res === null;
        });
    })
    .thenReturn(this);
  }


  toPlain (paths: dotPath.DotPath[], opt?: any): any {
    return {};
    // if (fields === null) {
    //   fields = _.keys(self._data);
    // }
    //
    // let model = new Model.Plain(this);
    // return model._load(fields, opt);
  };

  toJSON (): model.ModelToken {
    return this.getToken();
  }
}

export function getNewSync (ctor: model.ModelConstructor, opt?: any): model.Model {
  opt = _.assign({data: null}, opt);

  let model: model.Model = new ctor();

  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }

  return model
}

export function getNew (ctor: model.ModelConstructor, opt?: any): Bluebird<Model> {
  opt = _.assign({data: null, commit: false}, opt);

  return Bluebird.try(() => getNewSync(ctor, opt))
    .then((model: Model) => {
      return opt.commit ? model.commit(opt) : Bluebird.resolve(model);
    });
}

export function getByIdSync (ctor: model.ModelConstructor, id: string, opt?: any): model.Model {
  opt = _.assign({data: null}, opt);

  let model = new ctor({id: id});
  if (opt.data !== null) {
    model.updateLocal(opt.data);
  }
  return model;
}

export function getById (ctor: model.ModelConstructor, id: string, opt?: any): Bluebird<Model> {
  opt = _.assign({data: null, ensureExists: false}, opt)
  
  return Bluebird.try(() => getByIdSync(ctor, id, opt))
    .then((model: Model) => {
      if (!opt.ensureExists) {
        return Bluebird.resolve(model);
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

export function find (ctor: model.ModelConstructor, filter: Object, opt?: model.FindOptions): Bluebird<Model[]> {
  opt = _.defaults(opt || {}, {proxy: null});

  return Bluebird.resolve(opt.proxy)
    .then((proxy: proxy.Proxy) => {
      return Bluebird.resolve(proxy.read(filter))
        .then((cursor: proxy.Cursor) => {
          return cursor.toArray();
        })
        .map((doc: any, index: number, length: number) => {
          return getById(ctor, doc._id)
            .then(model => model.importData(doc, proxy.format));
        });
    });
}

export function cast(list: any[], modelsGroup: ModelsGroup): model.Model[] {
  let res: model.Model[] = [];
  for(let i = 0, l = list.length; i<l; i++){
    let cur = list[i];
    let ctor = modelsGroup.getModelClass(cur._name, true);
    res.push(ctor.getByIdSync(cur._id)); // updateLocal ?
  }
  return res;
}

export function castOne(token: model.ModelToken, modelsGroup: ModelsGroup): any {
  if (token === null) {
    return null;
  }
  let ctor = modelsGroup.getModelClass(token._name, true);
  return getByIdSync(ctor, token._id, {}); // updateLocal ?
}

export function StaticAccessors(): ClassDecorator {
  return function generateAccessors<TFunction extends StaticModel>(ctor: TFunction): TFunction {
    ctor.getNewSync = function(opt){
      return <Model> getNewSync(ctor, opt);
    };

    ctor.getNew = function(options?: any) {
      return getNew(ctor, options);
    };

    ctor.getByIdSync = function(id: string, opt?: any){
      return <Model> getByIdSync(ctor, id, opt);
    };

    ctor.getById = function(id: string, opt?: any){
      return getById(ctor, id, opt);
    };

    ctor.find = function(filter: utils.Document, options?: model.FindOptions){
      return find(ctor, filter, options);
    };

    return ctor;
  }
}
