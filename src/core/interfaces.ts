import {Model} from "./model";

export interface StaticModel {
  new(): Model;
}

export interface Query {
  [objectPath: string]: any;
}

export interface ModelToken {
  _id: string;
  _name: string;
}
