export enum CollectionId {
  NONE = '',

  BC = 'boston-college',
  BC_UNDERGRAD = 'boston-college-undergrads',
  BC_COMMUNITY = 'boston-college-community',
  BU = 'boston-university',
  NU = 'northeastern-university',
  MASS = 'massachusetts',
}

interface IKeyDates {
  date: string;
  comment: string;
}

export interface ICollection {
  id: CollectionId;
  name: string;
  population: number;
  children: CollectionId[];
  keyDates: IKeyDates[];
}
