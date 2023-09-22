interface IUserSettings {
  _id: string,
  accountNumber?: string,
  email?: string,
  phone?: string,
  accountIsActive?: boolean,
  maxAllowedDailyLoss?: number,
};

export default IUserSettings;