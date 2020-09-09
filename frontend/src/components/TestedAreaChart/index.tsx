import React from 'react';
import moment from 'moment';
import { AreaChart, XAxis, YAxis, Legend, Area, Tooltip, Brush } from 'recharts';

import style from './style.module.css';
import { ChartContainer } from '../index';
import { CollectedDataItem, Collection } from '../../types';

interface TestedAreaChartProps {
  collections: Collection[];
  data: CollectedDataItem[];
}

export const TestedAreaChart = (props: TestedAreaChartProps) => {
  // format date property from Date obj to milliseconds
  const toPlotData = (data: CollectedDataItem[]): any[] => {
    return data.map((item: CollectedDataItem) => {
      const { date, ...rest } = item;

      return {
        ...rest,
        date: new Date(date).getTime(),
      };
    });
  };

  const dateTickFormatter = (tick: number) => moment(tick).format('M/D');

  const renderTooltipContent = (o: any) => {
    const { payload, label } = o;

    interface MappedEntry {
      index: number;
      value: number;
    }

    const mapped = payload.map((entry: any, index: number): MappedEntry => {
      return { index, value: entry.value };
    });

    mapped.sort((a: MappedEntry, b: MappedEntry) => {
      if (a.value < b.value) return 1;
      if (a.value > b.value) return -1;
      return 0;
    });

    return (
      <div className={style.customTooltip}>
        <p>{dateTickFormatter(label)}</p>
        {
          mapped.map((entry: MappedEntry) => (
            <p key={`item-${entry.index}`} style={{ color: payload[entry.index].color }}>
              {`${payload[entry.index].name.split('_')[0].replace(/-/g, ' ')}: ${entry.value}`}
            </p>
          ))
        }
      </div>
    );
  };

  return (
    <ChartContainer
      title="Cumulative Tests"
      width={'100%'}
      height={500}
      chartComp={AreaChart}
      chartProps={{ data: toPlotData(props.data) }}
    >
      <XAxis
        dataKey="date"
        tickFormatter={dateTickFormatter}
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
      />
      <YAxis />
      <Tooltip content={renderTooltipContent} />
      <Brush dataKey="date" tickFormatter={dateTickFormatter} />
      <Legend />
      {props.collections.map((collection: Collection) => collection.id === 'massachusetts' ? null : (
        <Area
          key={`testedArea_${collection.id}`}
          type="monotone"
          connectNulls
          dataKey={`${collection.id}_tested`}
          stroke={`#${collection.color || 'ff0000'}`}
          fillOpacity={0}
        />
      ))}
    </ChartContainer>
  );
};
