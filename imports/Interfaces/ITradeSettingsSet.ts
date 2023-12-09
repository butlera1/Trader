import ITradeSettings from './ITradeSettings';

interface ITradeSettingsSet {
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

export {ITradeSettingsSet as default, DefaultTradeSettingsSets};
