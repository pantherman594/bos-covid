import { CollectionId, ICollection } from '../types';

interface ICollections {
  [id: string]: ICollection;
}

const collections: ICollections = {
  [CollectionId.BC]: {
    id: CollectionId.BC,
    name: 'Boston College',
    population: 0,
    parent: CollectionId.NONE,
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
    parent: CollectionId.BC,
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
    parent: CollectionId.BC,
    keyDates: [],
  },
  [CollectionId.BU]: {
    id: CollectionId.BU,
    name: 'Boston University',
    population: Math.round((34589 + 10517) * 0.8),
    parent: CollectionId.NONE,
    keyDates: [],
  },
  [CollectionId.NU]: {
    id: CollectionId.NU,
    name: 'Northeastern University',
    population: Math.round((20400 + 17379) + (3092 + 2859 + 210) * 0.8),
    parent: CollectionId.NONE,
    keyDates: [],
  },
  [CollectionId.MASS]: {
    id: CollectionId.MASS,
    name: 'Massachusetts',
    population: 6892503,
    parent: CollectionId.NONE,
    keyDates: [],
  },
};

export default collections;
