import { Thenable } from "bluebird";
import { model } from "via-core";
import { Model } from "../model";
import { ModelConstructor } from "./model-constructor";
export interface StaticModel extends ModelConstructor, model.StaticModel {
    getNewSync(opt?: any): Model;
    getNew(opt?: any): Thenable<Model>;
    getByIdSync(id: string, opt?: any): Model;
    getById(id: string, opt?: any): Thenable<Model>;
    find(filter: Object, opt?: model.FindOptions): Thenable<Model[]>;
}
