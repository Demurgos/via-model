import * as Promise from "bluebird";

export interface Proxy {
  format: string;
  exists: (id: string) => Promise<boolean>;
  create: (data: any) => Promise<any>;
  get: (id: string, data: any) => Promise<any>;
  set: (id: string, data: any) => Promise<any>;
  find: (data: any) => Promise<any>;
  [key: string]: any;
}
