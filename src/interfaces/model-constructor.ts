import {model} from "via-core";

import {Model} from "../model";

export interface ModelConstructor extends model.ModelConstructor {
  new (options?: any): Model;
}
