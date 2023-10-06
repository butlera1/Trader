interface IUserSettings {
  _id: string,
  accountNumber?: string,
  email?: string,
  phone?: string,
  accountIsActive?: boolean,
  maxAllowedDailyLoss?: number,
  maxAllowedDailyGain?: number,
  isMaxGainAllowedMet?: boolean,
}

export const DefaultUserSettings: IUserSettings = {
  _id: '',
  accountNumber: 'None',
  email: 'None',
  phone: 'None',
  accountIsActive: true,
  maxAllowedDailyLoss: 1000,
  maxAllowedDailyGain: 1000,
  isMaxGainAllowedMet: false,
};

export default IUserSettings;