import { model } from "via-core";
export declare class ModelsGroup {
    private _modelClasses;
    getModelClass(model: string | model.StaticModel, ensureExists: boolean): model.StaticModel;
    setModelClass(name: string, ctor: model.StaticModel, opt?: any): model.StaticModel;
}
