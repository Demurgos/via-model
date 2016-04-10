import * as Promise from "bluebird";

import {Model} from "./model";
import {Dictionary} from "via-core";
import {Proxy} from "via-core";

export interface Query {
  [objectPath: string]: any;
}

export interface ModelToken {
  _id: string;
  _name: string;
}

export interface GetProxyOptions {
  proxy?: Proxy;
}

export interface ExistsOptions {
  proxy?: Proxy;
  strict: boolean;
}

export interface CommitOptions {
  proxy?: Proxy;
}

export type LoadOptions = GetProxyOptions;

export interface IModel {
  _name: string;
  updateLocal (data: Dictionary<any>): Model;
  toJSON (): ModelToken;
}

export interface FindOptions {
  proxy?: Proxy;
}

export interface ModelConstructor {
  new (options?: any): Model;
}

export interface StaticModel extends ModelConstructor {
  getNewSync (opt?: any): Model;
  getNew (opt?: any): Promise<Model>;
  getByIdSync (id: string, opt?: any): Model;
  getById (id: string, opt?: any): Promise<Model>;
  find (filter: Object, opt?: FindOptions): Promise<Model[]>;
}
