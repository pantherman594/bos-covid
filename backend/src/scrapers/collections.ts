import { CollectionId, ICollection } from '../types';

interface ICollections {
  [id: string]: ICollection;
}

const collections: ICollections = {
  [CollectionId.BC]: {
    id: CollectionId.BC,
    name: 'Boston College',
    population: 0,
    children: [CollectionId.BC_UNDERGRAD, CollectionId.BC_COMMUNITY],
    keyDates: [
      {
        date: '2020-08-31',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.BC_UNDERGRAD]: {
    id: CollectionId.BC_UNDERGRAD,
    name: 'Boston College Undergraduates',
    population: Math.round(9370 * 0.8),
    children: [],
    keyDates: [
      {
        date: '2020-08-17',
        comment: 'Early move in begins',
      },
      {
        date: '2020-08-28',
        comment: 'Most undergraduate students begin to move in',
      },
    ],
  },
  [CollectionId.BC_COMMUNITY]: {
    id: CollectionId.BC_COMMUNITY,
    name: 'Boston College Community',
    population: Math.round((4801 + 2621.45 + 878 + 1291.33) * 0.8),
    children: [],
    keyDates: [],
  },
  [CollectionId.BABSON]: {
    id: CollectionId.BABSON,
    name: 'Babson College',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-24',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.BENTLEY]: {
    id: CollectionId.BENTLEY,
    name: 'Bentley University',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-31',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.BRANDEIS]: {
    id: CollectionId.BRANDEIS,
    name: 'Brandeis University',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-26',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.BU]: {
    id: CollectionId.BU,
    name: 'Boston University',
    population: Math.round((34589 + 10517) * 0.8),
    children: [],
    keyDates: [
      {
        date: '2020-09-09',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.NU]: {
    id: CollectionId.NU,
    name: 'Northeastern University',
    population: Math.round((20400 + 17379) + (3092 + 2859 + 210) * 0.8),
    children: [],
    keyDates: [
      {
        date: '2020-09-02',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.TUFTS]: {
    id: CollectionId.TUFTS,
    name: 'Tufts University',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-09-08',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.UMASS_AMHERST]: {
    id: CollectionId.UMASS_AMHERST,
    name: 'UMass Amherst',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-24',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.UMASS_BOSTON]: {
    id: CollectionId.UMASS_BOSTON,
    name: 'UMass Boston',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-09-08',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.UMASS_LOWELL]: {
    id: CollectionId.UMASS_LOWELL,
    name: 'UMass Lowell',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-09-01',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.MASS]: {
    id: CollectionId.MASS,
    name: 'Massachusetts',
    population: 6892503,
    children: [],
    keyDates: [],
  },
};

export default collections;
