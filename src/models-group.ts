import {utils, model} from "via-core";
import * as _ from "lodash";

export class ModelsGroup {
  private _modelClasses: utils.Dictionary<model.StaticModel> = {};

  getModelClass (model: string | model.StaticModel, ensureExists: boolean): model.StaticModel {
    let res: model.StaticModel = null;
    if (_.isString(model)) {
      res = this._modelClasses[model] || null;
    } else {
      // TODO: check if it is really a StaticModel
      res = <model.StaticModel> model;
    }

    if (ensureExists !== false && res === null) {
      throw new Error("unknownModel");
      // throw new _Error("unknownModel", {name: name}, `Unknown model name ${name}`);
    }
    return res;
  }

  setModelClass (name: string, ctor: model.StaticModel, opt?: any): model.StaticModel {
    opt = _.assign({}, opt);

    // Model.generateAccessors(ctor)
    return this._modelClasses[name] = ctor;
  }
}
