import {Dictionary} from "via-core";
import {StaticModel} from "./interfaces";
import * as _ from "lodash";

export class ModelsGroup {
  private _modelClasses: Dictionary<StaticModel> = {};

  getModelClass (model: string | StaticModel, ensureExists: boolean): StaticModel {
    let res: StaticModel = null;
    if (_.isString(model)) {
      res = this._modelClasses[model] || null;
    } else {
      // TODO: check if it is really a StaticModel
      res = <StaticModel> model;
    }

    if (ensureExists !== false && res === null) {
      throw new Error("unknownModel");
      // throw new _Error("unknownModel", {name: name}, `Unknown model name ${name}`);
    }
    return res;
  }

  setModelClass (name: string, ctor: StaticModel, opt?: any): StaticModel {
    opt = _.assign({}, opt);

    // Model.generateAccessors(ctor)
    return this._modelClasses[name] = ctor;
  }
}
