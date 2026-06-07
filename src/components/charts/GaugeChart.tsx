import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface GaugeChartProps {
  value: number;
  max?: number;
  title: string;
  unit: string;
  thresholds?: { warning: number; danger: number };
  height?: number;
}

export default function GaugeChart({ value, max = 100, title, unit, thresholds, height = 180 }: GaugeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    let color = '#10b981';
    if (thresholds) {
      if (value >= thresholds.danger) color = '#ef4444';
      else if (value >= thresholds.warning) color = '#f97316';
    }

    const option: EChartsOption = {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max,
          splitNumber: 10,
          radius: '90%',
          center: ['50%', '60%'],
          itemStyle: {
            color,
          },
          progress: {
            show: true,
            width: 12,
            roundCap: true,
          },
          pointer: {
            show: false,
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 12,
              color: [[1, '#1e293b']],
            },
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
          anchor: {
            show: false,
          },
          title: {
            show: true,
            offsetCenter: [0, '50%'],
            fontSize: 12,
            color: '#94a3b8',
          },
          detail: {
            valueAnimation: true,
            fontSize: 28,
            fontWeight: 'bold',
            offsetCenter: [0, '10%'],
            formatter: `{value}${unit}`,
            color,
            fontFamily: 'JetBrains Mono, monospace',
          },
          data: [
            {
              value: Number(value.toFixed(1)),
              name: title,
            },
          ],
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
  }, [value, max, title, unit, thresholds, height]);

  return <div ref={chartRef} style={{ height }} />;
}
