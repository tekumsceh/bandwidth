export type CurrentUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  defaultCurrency?: string;
  localCurrency?: string;
};

