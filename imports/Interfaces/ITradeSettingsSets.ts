import ITradeSettings from './ITradeSettings';

interface ITradeSettingsSets {
  _id?: string,
  tradeSettings: ITradeSettings[],
  userId: string,
  name: string,
  isDefault: boolean,
}

const DefaultTradeSettingsSets = {
  tradeSettings: [],
  userId: '',
  name: 'No name',
  isDefault: false,
};

export {ITradeSettingsSets as default, DefaultTradeSettingsSets};
