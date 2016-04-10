import { StaticModel } from "./interfaces";
export declare class ModelsGroup {
    private _modelClasses;
    getModelClass(model: string | StaticModel, ensureExists: boolean): StaticModel;
    setModelClass(name: string, ctor: StaticModel, opt?: any): StaticModel;
}
