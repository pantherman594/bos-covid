export enum CollectionId {
  NONE = '',

  BC = 'boston-college',
  BC_UNDERGRAD = 'boston-college-undergrads',
  BC_COMMUNITY = 'boston-college-community',
  BABSON = 'babson-college',
  BENTLEY = 'bentley-university',
  BRANDEIS = 'brandeis-university',
  BU = 'boston-university',
  NU = 'northeastern-university',
  TUFTS = 'tufts-university',
  UMASS_AMHERST = 'umass-amherst',
  UMASS_BOSTON = 'umass-boston',
  UMASS_LOWELL = 'umass-lowell',

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
