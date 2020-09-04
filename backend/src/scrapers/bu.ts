import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { strToMonth, ymdToString } from '../lib/date';
import { tryParseInt, tryTraverse } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

// From
// https://app.powerbi.com/view?r=eyJrIjoiMzI4OTBlMzgtODg5MC00OGEwLThlMDItNGJiNDdjMDU5ODhkIiwidCI6ImQ1N2QzMmNjLWMxMjEtNDg4Zi1iMDdiLWRmZTcwNTY4MGM3MSIsImMiOjN9,
// and https://www.bu.edu/healthway/community-dashboard/.
const DATA_URL = 'https://wabi-us-north-central-api.analysis.windows.net/public/reports/querydata?synchronous=true';
const RESOURCE_KEY = '32890e38-8890-48a0-8e02-4bb47c05988d';

const DATA_COMMAND = {
  Query: {
    Version: 2,
    From: [{ Name: 'c', Entity: 'Cumulative Testing Combined', Type: 0 }],
    Select: [
      {
        Measure: {
          Expression: { SourceRef: { Source: 'c' } },
          Property: 'Cumulative Results',
        },
        Name: 'Cumulative Testing Combined.Cumulative Results',
      },
      {
        Measure: {
          Expression: { SourceRef: { Source: 'c' } },
          Property: 'Cumulative Positives',
        },
        Name: 'Cumulative Testing Combined.Cumulative Positives',
      },
    ],
    OrderBy: [{
      Direction: 2,
      Expression: {
        Measure: {
          Expression: {
            SourceRef: {
              Source: 'c',
            },
          },
          Property: 'Cumulative Results',
        },
      },
    }],
  },
  Binding: {
    Primary: { Groupings: [{ Projections: [0, 1] }] },
    DataReduction: { DataVolume: 3, Primary: { Window: {} } },
    Version: 1,
  },
};

const DATE_COMMAND = {
  Query: {
    Version: 2,
    From: [{ Name: 't', Entity: 'Testing Today Combined', Type: 0 }],
    Select: [{
      Measure: {
        Expression: { SourceRef: { Source: 't' } },
        Property: 'Header BU Test through Date',
      },
      Name: 'Testing Today Combined.Header BU Test through Date',
    }],
  },
  Binding: {
    Primary: { Groupings: [{ Projections: [0] }] },
    DataReduction: { DataVolume: 3, Primary: { Top: {} } },
    Version: 1,
  },
};

const generateRequest = (...commands: any[]) => {
  const request = {
    version: '1.0.0',
    queries: commands.map((command: any) => ({
      Query: {
        Commands: [
          {
            SemanticQueryDataShapeCommand: command,
          },
        ],
      },
      QueryId: '',
      ApplicationContext: {
        DatasetId: '05640cb4-075c-4bec-87d1-2b0b7df65918',
        Sources: [{
          ReportId: '0f711970-f662-4b15-9c08-1d4090b80ec9',
        }],
      },
    })),
    cancelQueries: [],
    modelId: 11982553,
  };

  return request;
};

const scrapeBu = async (): Promise<DocumentType<Data>> => {
  const res = await superagent.post(DATA_URL)
    .send(generateRequest(DATA_COMMAND, DATE_COMMAND))
    .set('X-PowerBI-ResourceKey', RESOURCE_KEY)
    .set('Accept', 'application/json');

  const data = JSON.parse(res.text);

  const dataJob = tryTraverse(data, ['jobIds', 0]);

  const dataIndex = tryTraverse(data, ['results', 0, 'jobId']) === dataJob ? 0 : 1;
  const dateIndex = 1 - dataIndex;

  const [tested, positive] = tryTraverse(data, ['results', dataIndex, 'result', 'data',
    'dsr', 'DS', 0, 'PH', 0, 'DM0', 0, 'C']);

  if (typeof tested !== 'number' || typeof positive !== 'number') {
    throw new Error('Incorrect data type found.');
  }

  const updatedText = tryTraverse(data, ['results', dateIndex, 'result', 'data', 'dsr',
    'DS', 0, 'PH', 0, 'DM0', 0, 'M0']);

  const match = updatedText.match(/^BU Testing through ([A-Z][a-z]+) ([0-9]{1,2}), ([0-9]{4})$/);

  if (!match) {
    throw new Error('Updated date format invalid.');
  }

  const month = strToMonth(match[1]);
  const day = tryParseInt(match[2]);
  const year = tryParseInt(match[3]);

  return new DataModel({
    collectionId: CollectionId.BU,
    date: ymdToString(year, month, day),
    tested,
    positive,
  });
};

export default scrapeBu;
