import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  Cpu,
  AlertTriangle,
  HardHat,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Card, Form, Select, DatePicker, Button, Space, message } from 'antd';
import dayjs from 'dayjs';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import LineChart from '@/components/charts/LineChart';
import { usePermission } from '@/hooks/usePermission';
import { api } from '@/services/api';
import {
  formatNumber,
  formatPercent,
  formatTime,
} from '@/utils/format';
import { mockCabins } from '@/services/mock/mockData';
import type { StatisticsData, Cabin } from '@/types/models';

const { RangePicker } = DatePicker;
const { Option } = Select;

const pipelineTypes = [
  { value: 'electric', label: '电力' },
  { value: 'communication', label: '通信' },
  { value: 'gas', label: '燃气' },
  { value: 'waterSupply', label: '供水' },
  { value: 'drainage', label: '排水' },
];

export default function StatisticsOverview() {
  const { canViewAllData } = usePermission();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, cabinsData] = await Promise.all([
        api.getStatistics(),
        api.getCabins(),
      ]);
      setStatistics(statsData);
      setCabins(cabinsData);
      setLastUpdate(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    } catch {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
    message.success('筛选条件已应用');
  };

  const handleReset = () => {
    form.resetFields();
    fetchData();
  };

  const environmentChartData = useMemo(() => {
    const cabinNames = mockCabins.map((c) => c.name);
    const complianceData = mockCabins.map(() => 85 + Math.random() * 15);
    
    return {
      categories: cabinNames,
      values: [
        { name: '环境达标率(%)', data: complianceData, color: '#10b981' },
      ],
    };
  }, []);

  const deviceChartData = useMemo(() => {
    const running = 45;
    const stopped = 15;
    const fault = 8;
    const auto = 32;
    
    return [
      { name: '运行中', value: running, color: '#10b981' },
      { name: '自动', value: auto, color: '#0ea5e9' },
      { name: '已停止', value: stopped, color: '#64748b' },
      { name: '故障', value: fault, color: '#ef4444' },
    ];
  }, []);

  const hazardTrendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => 
      dayjs().subtract(6 - i, 'day').format('MM-DD')
    );
    const reportedData = days.map(() => Math.floor(Math.random() * 5) + 1);
    const completedData = days.map(() => Math.floor(Math.random() * 4) + 1);
    const inProgressData = days.map(() => Math.floor(Math.random() * 3) + 1);
    
    return {
      time: days,
      values: [
        { name: '已上报', data: reportedData, color: '#f97316' },
        { name: '整改中', data: inProgressData, color: '#3b82f6' },
        { name: '已完成', data: completedData, color: '#10b981' },
      ],
    };
  }, []);

  const constructionMonthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => 
      dayjs().subtract(5 - i, 'month').format('YYYY-MM')
    );
    const occupancyData = months.map(() => 20 + Math.random() * 40);
    const countData = months.map(() => Math.floor(Math.random() * 5) + 2);
    
    return {
      categories: months,
      values: [
        { name: '施工占用率(%)', data: occupancyData, color: '#f97316' },
        { name: '施工数量', data: countData, color: '#8b5cf6' },
      ],
    };
  }, []);

  if (!canViewAllData()) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={48} className="text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">权限不足</h2>
          <p className="text-gray-400">仅管理员和运行主管可查看统计总览</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 overflow-auto h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">统计总览</h1>
          <p className="text-gray-400 text-sm mt-1">全局数据统计分析与可视化展示</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>更新时间: {formatTime(lastUpdate)}</span>
            </div>
          )}
          <StatusBadge status="online" label="实时更新中" color="#10b981" pulse />
        </div>
      </div>

      <Card className="data-card mb-6" size="small">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          className="flex flex-wrap gap-4 items-end"
        >
          <Form.Item name="cabinId" label="舱段">
            <Select placeholder="选择舱段" style={{ width: 150 }} allowClear>
              {cabins.map((cabin) => (
                <Option key={cabin.id} value={cabin.id}>
                  {cabin.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="pipelineType" label="管线类型">
            <Select placeholder="选择管线类型" style={{ width: 150 }} allowClear>
              {pipelineTypes.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<Filter size={14} />}>
                筛选
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button icon={<RefreshCw size={14} />} onClick={fetchData} loading={loading}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {statistics && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-4 mb-6"
          >
            <StatCard
              title="环境达标率"
              value={formatNumber(statistics.environmentComplianceRate, 1)}
              unit="%"
              icon={Leaf}
              trend={{ value: 2.3, isUp: true }}
              color="success"
            />
            <StatCard
              title="设备完好率"
              value={formatNumber(statistics.deviceIntactRate, 1)}
              unit="%"
              icon={Cpu}
              trend={{ value: 1.5, isUp: true }}
              color="primary"
            />
            <StatCard
              title="隐患整改进度"
              value={formatNumber(statistics.hazardRectificationProgress, 1)}
              unit="%"
              icon={AlertTriangle}
              trend={{ value: 5.2, isUp: true }}
              color="warning"
            />
            <StatCard
              title="施工占用量"
              value={formatNumber(statistics.constructionOccupancy, 1)}
              unit="%"
              icon={HardHat}
              trend={{ value: 3.1, isUp: false }}
              color="danger"
            />
          </motion.div>

          <div className="grid grid-cols-12 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="col-span-7"
            >
              <Card className="data-card h-full" size="small">
                <h3 className="text-lg font-semibold text-white mb-4">各舱段环境达标率</h3>
                <BarChart data={environmentChartData} height={320} />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-5"
            >
              <Card className="data-card h-full" size="small">
                <h3 className="text-lg font-semibold text-white mb-4">设备完好率分布</h3>
                <PieChart data={deviceChartData} height={320} />
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-7"
            >
              <Card className="data-card h-full" size="small">
                <h3 className="text-lg font-semibold text-white mb-4">隐患整改进度趋势</h3>
                <LineChart data={hazardTrendData} yAxisName="数量" height={320} />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="col-span-5"
            >
              <Card className="data-card h-full" size="small">
                <h3 className="text-lg font-semibold text-white mb-4">施工占用量月度对比</h3>
                <BarChart data={constructionMonthlyData} height={320} />
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
