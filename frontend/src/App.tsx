import React, { useEffect, useState }from 'react';
import superagent from 'superagent';

import {
  TestedAreaChart,
  PositiveAreaChart,
} from './components';
import { CollectedDataItem, Collection, CovidDataItem } from './types';
import './App.css';

export const App: React.FunctionComponent = () => {
  const [data, setData] = useState<CovidDataItem[]>([]);
  const [collections, setCollections] = useState<{ [id: string]: Collection }>({});
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const url = process.env.NODE_ENV !== 'production'
        ? 'https://boscovid.dav.sh/data'
        : 'http://localhost:5000/data';

      const res = await superagent.get(url);

      const { data, collections } = res.body;

      setData(data);
      setCollections(collections);

      window.localStorage.setItem('data', JSON.stringify(data));
      window.localStorage.setItem('collections', JSON.stringify(collections));

      setLoading(false);
    };

    if (window.localStorage.getItem('data') !== null) {
      setData(JSON.parse(window.localStorage.getItem('data') as string));
      setCollections(JSON.parse(window.localStorage.getItem('collections') as string));
      setLoading(false);

      setTimeout(loadData, 1000);
    } else {
      setShowLoading(true);
      loadData();
    }
  }, []);

  const collectionArray = Object.values(collections);

  const parents = new Map<string, string>();
  collectionArray.forEach((collection: Collection) => {
    collection.children.forEach((childId: string) => {
      parents.set(childId, collection.id);
    });
  });

  const indexMap = new Map<string, number>();
  const collectedData: CollectedDataItem[] = [];

  data.forEach((entry: CovidDataItem) => {
    if (!indexMap.has(entry.date)) {
      indexMap.set(entry.date, collectedData.length);
      collectedData.push({
        date: entry.date,
      });
    }

    const index = indexMap.get(entry.date)!;

    collectedData[index][`${entry.collectionId}_tested`] = entry.tested;
    collectedData[index][`${entry.collectionId}_positive`] = entry.positive;

    if (parents.has(entry.collectionId)) {
      const parentId = parents.get(entry.collectionId);

      const prevTested = collectedData[index][`${parentId}_tested`] as number || 0;
      const prevPositive = collectedData[index][`${parentId}_positive`] as number || 0;

      collectedData[index][`${parentId}_tested`] = prevTested + entry.tested;
      collectedData[index][`${parentId}_positive`] = prevPositive + entry.positive;
    }
  });

  return (
    <div className="App" style={{ overflowY: loading ? 'hidden' : 'auto' }}>
      { loading ? null :
        <React.Fragment>
          <h1>Boston Area University Covid-19 Statistics</h1>
          <h3>
            {'Updated: '}
            {data.length === 0
                ? null
                : new Date(data[data.length - 1].date).toLocaleDateString(
                    undefined,
                    { day: 'numeric', month: 'numeric' },
                  )}
          </h3>

          <svg>
            <defs>
              {collectionArray.map((collection: Collection) => (
                <linearGradient
                  id={`grad_${collection.id}`}
                  key={`grad_${collection.id}`}
                  x1="0" x2="0"
                  y1="0" y2="1"
                >
                  <stop offset="5%" stopColor={`#${collection.color || 'ff0000'}`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`#${collection.color || 'ff0000'}`} stopOpacity={0.2} />
                </linearGradient>
              ))}
            </defs>
          </svg>

          <TestedAreaChart collections={collectionArray} data={collectedData} />

          <PositiveAreaChart collections={collectionArray} data={collectedData} />

          {/*
          <PercentPositiveChart data={data} />
          <div className="hint">"Total" refers to the entire BC community, including undergrad and grad students, faculty, and staff.</div>

          <TestedBarChart data={data} />
          <div className="hint">"Total" refers to the entire BC community, including undergrad and grad students, faculty, and staff. "Remaining" refers to that total minus the undergraduate stats.</div>

          <PopulationPercentChart data={data} recoveryDays={10} />
          <div className="hint">Take these values with a huge grain of salt. Many assumptions were made about population sizes and recovery times.</div>
          */}

          <p style={{ paddingBottom: 0 }}>Made by David Shen</p>

          <a href="https://boscovid.dav.sh/data">collected data</a>{' '}

          <br />

          <a href="https://github.com/pantherman594/bos-covid/">source code</a>
        </React.Fragment>
      }
      <div className="loading" style={{ opacity: loading && showLoading ? 1 : 0 }}>
        Loading...
      </div>
    </div>
  );
};
