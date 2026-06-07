import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

export default function PieChart({ data, title, height = 300, showLegend = true }: PieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const total = data.reduce((sum, item) => sum + item.value, 0);

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
            left: 'center',
            top: 10,
          }
        : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#334155',
        textStyle: {
          color: '#f1f5f9',
        },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: showLegend
        ? {
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: {
              color: '#94a3b8',
              fontSize: 12,
            },
            formatter: (name: string) => {
              const item = data.find((d) => d.name === name);
              return item ? `${name}  ${item.value}` : name;
            },
          }
        : undefined,
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: showLegend ? ['35%', '55%'] : ['50%', '55%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#1e293b',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#f1f5f9',
              formatter: '{b}\n{d}%',
            },
          },
          labelLine: {
            show: false,
          },
          data: data.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: item.color,
            },
          })),
        },
        {
          type: 'pie',
          radius: ['45%', '45%'],
          center: showLegend ? ['35%', '55%'] : ['50%', '55%'],
          label: {
            show: true,
            position: 'center',
            formatter: `{total|${total}}\n{unit|总计}`,
            rich: {
              total: {
                fontSize: 24,
                fontWeight: 'bold',
                color: '#f1f5f9',
                fontFamily: 'JetBrains Mono, monospace',
              },
              unit: {
                fontSize: 12,
                color: '#94a3b8',
                padding: [4, 0, 0, 0],
              },
            },
          },
          data: [{ value: 1, name: '', itemStyle: { color: 'transparent' } }],
        },
      ],
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
  }, [data, title, height, showLegend]);

  return <div ref={chartRef} style={{ height }} />;
}
