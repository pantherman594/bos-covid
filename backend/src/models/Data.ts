import {
  getModelForClass,
  index,
  prop,
} from 'typegoose';

import { CollectionId } from '../types';

@index({ date: 1 })
@index({ collection: 1, date: 1 })
export class Data {
  @prop({ required: true, enum: CollectionId, type: String })
  public collectionId!: CollectionId;

  @prop({ required: true })
  public date!: string;

  @prop({ required: true })
  public tested!: number;

  @prop({ required: true })
  public positive!: number;
}

const DataModel = getModelForClass(Data);
export default DataModel;
