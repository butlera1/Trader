interface IUserSettings {
  _id: string,
  accountNumber?: number,
  email?: string,
  phone?: string,
  accountIsActive?: boolean,
  maxAllowedDailyLoss?: number,
};

export default IUserSettings;