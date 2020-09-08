export enum CollectionId {
  NONE = '',

  BC = 'boston-college',
  BC_UNDERGRAD = 'boston-college-undergrads',
  BC_COMMUNITY = 'boston-college-community',
  BABSON = 'babson-college',
  BENTLEY = 'bentley-university',
  BRANDEIS = 'brandeis-university',
  BU = 'boston-university',
  HARVARD = 'harvard-university',
  HARVARD_UNDERGRAD = 'harvard-university-undergrad',
  HARVARD_GRAD = 'harvard-university-grad',
  HARVARD_OTHER = 'harvard-university-other',
  MIT = 'massachusetts-institute-of-technology',
  NU = 'northeastern-university',
  TUFTS = 'tufts-university',
  UMASS_AMHERST = 'umass-amherst',
  WELLESLEY = 'wellesley-college',

  MASS = 'massachusetts',
}

interface IKeyDates {
  date: string;
  comment: string;
}

export interface ICollection {
  id: CollectionId;
  name: string;
  color: string;
  population: number;
  children: CollectionId[];
  keyDates: IKeyDates[];
}
