import * as Bluebird from "bluebird";
import {defineProperty} from "./helpers";
import {Model} from "./model";

export class PlainModel {
  public _: Model;

  constructor(model: Model) {
    defineProperty(this, "_", {value: model});
  }
}
