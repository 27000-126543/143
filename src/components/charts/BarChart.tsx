import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface BarChartProps {
  data: {
    categories: string[];
    values: { name: string; data: number[]; color: string }[];
  };
  title?: string;
  horizontal?: boolean;
  height?: number;
}

export default function BarChart({ data, title, horizontal = false, height = 300 }: BarChartProps) {
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
          type: horizontal ? 'shadow' : 'shadow',
        },
      },
      legend: {
        data: data.values.map((v) => v.name),
        textStyle: {
          color: '#94a3b8',
        },
        top: 10,
        right: 10,
      },
      grid: {
        left: 50,
        right: 20,
        top: title ? 50 : 40,
        bottom: 30,
      },
      xAxis: horizontal
        ? {
            type: 'value',
            axisLine: { show: false },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            splitLine: { lineStyle: { color: '#1e293b' } },
          }
        : {
            type: 'category',
            data: data.categories,
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
          },
      yAxis: horizontal
        ? {
            type: 'category',
            data: data.categories,
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
          }
        : {
            type: 'value',
            axisLine: { show: false },
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            splitLine: { lineStyle: { color: '#1e293b' } },
          },
      series: data.values.map((series) => ({
        name: series.name,
        type: 'bar',
        data: series.data,
        barWidth: '40%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, horizontal ? 1 : 0, 1, [
            { offset: 0, color: series.color },
            { offset: 1, color: series.color + '60' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      })),
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, title, horizontal, height]);

  return <div ref={chartRef} style={{ height }} />;
}
