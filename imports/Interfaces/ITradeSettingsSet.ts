interface ITradeSettingsSet {
  _id?: string,
  tradeSettingIds: string[],
  userId: string,
  name: string,
  isDefault: boolean,
}

const DefaultTradeSettingsSets :ITradeSettingsSet = {
  tradeSettingIds: [],
  userId: '',
  name: 'No name',
  isDefault: false,
};

export {ITradeSettingsSet as default, DefaultTradeSettingsSets};
