import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface LineChartProps {
  data: {
    time: string[];
    values: { name: string; data: number[]; color: string }[];
  };
  title?: string;
  yAxisName?: string;
  height?: number;
  threshold?: { warning: number; danger: number };
}

export default function LineChart({ data, title, yAxisName, height = 300, threshold }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: EChartsOption = {
      backgroundColor: 'transparent',
      title: title
        ? {
            text: title,
            textStyle: {
              color: '#f1f5f9',
              fontSize: 14,
              fontWeight: 500,
            },
            left: 10,
            top: 10,
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: {
          color: '#f1f5f9',
        },
        axisPointer: {
          lineStyle: {
            color: '#0ea5e9',
          },
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: title ? 50 : 20,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: data.time,
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: yAxisName,
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 11,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: '#1e293b',
          },
        },
      },
      series: data.values.map((series) => ({
        name: series.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: series.data,
        lineStyle: {
          color: series.color,
          width: 2,
        },
        itemStyle: {
          color: series.color,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: series.color + '40' },
            { offset: 1, color: series.color + '05' },
          ]),
        },
      })),
    };

    if (threshold) {
      option.series = [
        ...(option.series as any[]),
        {
          name: '预警阈值',
          type: 'line',
          data: new Array(data.time.length).fill(threshold.warning),
          lineStyle: {
            color: '#f97316',
            type: 'dashed',
            width: 1,
          },
          symbol: 'none',
          itemStyle: { color: 'transparent' },
        },
        {
          name: '危险阈值',
          type: 'line',
          data: new Array(data.time.length).fill(threshold.danger),
          lineStyle: {
            color: '#ef4444',
            type: 'dashed',
            width: 1,
          },
          symbol: 'none',
          itemStyle: { color: 'transparent' },
        },
      ];
    }

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, yAxisName, threshold]);

  return <div ref={chartRef} style={{ height }} />;
}
