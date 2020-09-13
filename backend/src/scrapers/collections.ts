import { CollectionId, ICollection } from '../types';

interface ICollections {
  [id: string]: ICollection;
}

const collections: ICollections = {
  [CollectionId.BC]: {
    id: CollectionId.BC,
    name: 'Boston College',
    color: '8a100b',
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
    color: '8a100b',
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
    color: '8a100b',
    population: Math.round((4801 + 2621.45 + 878 + 1291.33) * 0.8),
    children: [],
    keyDates: [],
  },
  [CollectionId.BABSON]: {
    id: CollectionId.BABSON,
    name: 'Babson College',
    color: '006644',
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
    color: '0075be',
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
    color: '003478',
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
    color: 'cc0000',
    population: Math.round((34589 + 10517) * 0.8),
    children: [],
    keyDates: [
      {
        date: '2020-09-09',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.HARVARD]: {
    id: CollectionId.HARVARD,
    name: 'Harvard University',
    color: 'a51c30',
    population: 0,
    children: [
      CollectionId.HARVARD_UNDERGRAD,
      CollectionId.HARVARD_GRAD,
      CollectionId.HARVARD_OTHER,
    ],
    keyDates: [
      {
        date: '2020-09-02',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.HARVARD_UNDERGRAD]: {
    id: CollectionId.HARVARD_UNDERGRAD,
    name: 'Harvard University Undergraduates',
    color: 'a51c30',
    population: 0,
    children: [],
    keyDates: [],
  },
  [CollectionId.HARVARD_GRAD]: {
    id: CollectionId.HARVARD_GRAD,
    name: 'Harvard University Graduate Students',
    color: 'a51c30',
    population: 0,
    children: [],
    keyDates: [],
  },
  [CollectionId.HARVARD_OTHER]: {
    id: CollectionId.HARVARD_OTHER,
    name: 'Harvard University Faculty, Staff, or Other Affiliates',
    color: 'a51c30',
    population: 0,
    children: [],
    keyDates: [],
  },
  [CollectionId.MIT]: {
    id: CollectionId.MIT,
    name: 'Massachusetts Institute of Technology',
    color: 'a31f34',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-09-01',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.NU]: {
    id: CollectionId.NU,
    name: 'Northeastern University',
    color: 'd41b2c',
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
    color: '3e8ede',
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
    color: '881c1c',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-24',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.WELLESLEY]: {
    id: CollectionId.WELLESLEY,
    name: 'Wellesley College',
    color: '002776',
    population: 0,
    children: [],
    keyDates: [
      {
        date: '2020-08-31',
        comment: 'Classes begin',
      },
    ],
  },
  [CollectionId.MASS]: {
    id: CollectionId.MASS,
    name: 'Massachusetts',
    color: '14558f',
    population: 6892503,
    children: [],
    keyDates: [],
  },
};

export default collections;
