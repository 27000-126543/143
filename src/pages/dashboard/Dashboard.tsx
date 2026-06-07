import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf,
  Cpu,
  AlertTriangle,
  ClipboardCheck,
  HardHat,
  FileText,
  Thermometer,
  Droplets,
  Wind,
  Biohazard,
  Waves,
  Droplet,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { message } from 'antd';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import GaugeChart from '@/components/charts/GaugeChart';
import { useAlarmStore } from '@/store/useAlarmStore';
import { usePermission } from '@/hooks/usePermission';
import { useUserStore } from '@/store/useUserStore';
import {
  sensorTypeLabels,
  alarmLevelLabels,
  alarmLevelColors,
  formatNumber,
  formatTime,
  getTimeAgo,
  cabinStatusLabels,
  cabinStatusColors,
  getSensorStatusColor,
} from '@/utils/format';
import { mockCabins, mockInspectionRecords, mockWorkOrders, mockConstructionApplies } from '@/services/mock/mockData';
import type { SensorData, Alarm, SensorType } from '@/types/models';

const sensorIcons: Record<SensorType, React.ElementType> = {
  temperature: Thermometer,
  humidity: Droplets,
  methane: Wind,
  hydrogenSulfide: Biohazard,
  liquidLevel: Waves,
  waterImmersion: Droplet,
};

const sensorThresholds: Record<SensorType, { warning: number; danger: number }> = {
  temperature: { warning: 35, danger: 40 },
  humidity: { warning: 80, danger: 90 },
  methane: { warning: 0.5, danger: 1.0 },
  hydrogenSulfide: { warning: 10, danger: 20 },
  liquidLevel: { warning: 50, danger: 80 },
  waterImmersion: { warning: 1, danger: 2 },
};

export default function Dashboard() {
  const { sensorData, alarms, devices, lastUpdate, loading, startRealtimeUpdate, acknowledgeAlarm } = useAlarmStore();
  const { hasPermission } = usePermission();
  const { user } = useUserStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPaused, setScrollPaused] = useState(false);

  useEffect(() => {
    const stopUpdate = startRealtimeUpdate();
    return () => stopUpdate();
  }, [startRealtimeUpdate]);

  useEffect(() => {
    if (!scrollContainerRef.current || scrollPaused) return;
    const container = scrollContainerRef.current;
    const scrollInterval = setInterval(() => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
        container.scrollTop = 0;
      } else {
        container.scrollTop += 1;
      }
    }, 50);
    return () => clearInterval(scrollInterval);
  }, [scrollPaused, alarms.length]);

  const statistics = useMemo(() => {
    const totalSensors = sensorData.length;
    const normalSensors = sensorData.filter((s) => s.status === 'normal').length;
    const environmentComplianceRate = totalSensors > 0 ? (normalSensors / totalSensors) * 100 : 0;

    const totalDevices = devices.length;
    const intactDevices = devices.filter((d) => d.status === 'running' || d.status === 'auto').length;
    const deviceIntactRate = totalDevices > 0 ? (intactDevices / totalDevices) * 100 : 0;

    const pendingAlarms = alarms.filter((a) => a.status === 'pending').length;

    const todayInspections = mockInspectionRecords.filter((r) =>
      r.checkInTime.startsWith(new Date().toISOString().split('T')[0])
    ).length;

    const inProgressConstructions = mockConstructionApplies.filter((c) => c.status === 'inProgress').length;

    const pendingWorkOrders = mockWorkOrders.filter((w) => w.status === 'pending').length;

    return {
      environmentComplianceRate,
      deviceIntactRate,
      pendingAlarms,
      todayInspections,
      inProgressConstructions,
      pendingWorkOrders,
    };
  }, [sensorData, devices, alarms]);

  const cabinSensorData = useMemo(() => {
    return mockCabins.map((cabin) => {
      const cabinSensors = sensorData.filter((s) => s.cabinId === cabin.id);
      const sensorMap: Record<SensorType, SensorData | undefined> = {
        temperature: undefined,
        humidity: undefined,
        methane: undefined,
        hydrogenSulfide: undefined,
        liquidLevel: undefined,
        waterImmersion: undefined,
      };

      (['temperature', 'humidity', 'methane', 'hydrogenSulfide', 'liquidLevel', 'waterImmersion'] as SensorType[]).forEach(
        (type) => {
          const typeSensors = cabinSensors.filter((s) => s.sensorType === type);
          if (typeSensors.length > 0) {
            const avgValue = typeSensors.reduce((sum, s) => sum + s.value, 0) / typeSensors.length;
            const worstStatus = typeSensors.some((s) => s.status === 'danger')
              ? 'danger'
              : typeSensors.some((s) => s.status === 'warning')
              ? 'warning'
              : 'normal';
            sensorMap[type] = {
              ...typeSensors[0],
              value: Number(avgValue.toFixed(2)),
              status: worstStatus,
            };
          }
        }
      );

      return {
        cabin,
        sensors: sensorMap,
      };
    });
  }, [sensorData]);

  const tempHumidityChartData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const baseTemp = 24;
    const baseHumidity = 62;

    const tempData = hours.map((_, i) => {
      const hourFactor = Math.sin((i / 24) * Math.PI * 2) * 4;
      const randomFactor = (Math.random() - 0.5) * 2;
      return Number((baseTemp + hourFactor + randomFactor).toFixed(1));
    });

    const humidityData = hours.map((_, i) => {
      const hourFactor = Math.cos((i / 24) * Math.PI * 2) * 8;
      const randomFactor = (Math.random() - 0.5) * 4;
      return Number(Math.max(30, Math.min(95, baseHumidity + hourFactor + randomFactor)).toFixed(1));
    });

    return {
      time: hours,
      values: [
        { name: '温度(℃)', data: tempData, color: '#f97316' },
        { name: '湿度(%)', data: humidityData, color: '#0ea5e9' },
      ],
    };
  }, []);

  const cabinAlarmChartData = useMemo(() => {
    const cabinNames = mockCabins.map((c) => c.name);
    const criticalData = mockCabins.map((cabin) =>
      alarms.filter((a) => a.cabinId === cabin.id && a.level === 'critical' && a.status !== 'resolved').length
    );
    const warningData = mockCabins.map((cabin) =>
      alarms.filter((a) => a.cabinId === cabin.id && a.level === 'warning' && a.status !== 'resolved').length
    );
    const noticeData = mockCabins.map((cabin) =>
      alarms.filter((a) => a.cabinId === cabin.id && a.level === 'notice' && a.status !== 'resolved').length
    );

    return {
      categories: cabinNames,
      values: [
        { name: '严重', data: criticalData, color: '#ef4444' },
        { name: '警告', data: warningData, color: '#f97316' },
        { name: '提示', data: noticeData, color: '#3b82f6' },
      ],
    };
  }, [alarms]);

  const sortedAlarms = useMemo(() => {
    return [...alarms]
      .filter((a) => a.status !== 'resolved' && a.status !== 'closed')
      .sort((a, b) => {
        const levelOrder = { critical: 0, warning: 1, notice: 2 };
        const statusOrder = { pending: 0, acknowledged: 1, processing: 2 };
        if (levelOrder[a.level] !== levelOrder[b.level]) {
          return levelOrder[a.level] - levelOrder[b.level];
        }
        if (statusOrder[a.status as keyof typeof statusOrder] !== statusOrder[b.status as keyof typeof statusOrder]) {
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [alarms]);

  const handleAcknowledgeAlarm = async (alarm: Alarm) => {
    if (!hasPermission('alarm:handle')) {
      message.error('您没有处理告警的权限');
      return;
    }
    if (!user) return;
    try {
      await acknowledgeAlarm(alarm.id, user.id, user.name);
      message.success(`已确认告警: ${alarm.title}`);
    } catch {
      message.error('确认告警失败，请重试');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 overflow-auto h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">实时监控仪表板</h1>
          <p className="text-gray-400 text-sm mt-1">智慧城市地下综合管廊运维平台</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />
              <span>更新时间: {formatTime(lastUpdate)}</span>
            </div>
          )}
          <StatusBadge status="online" label="实时连接中" color="#10b981" pulse />
        </div>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-6 gap-4 mb-6">
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
          title="当前告警数"
          value={statistics.pendingAlarms}
          icon={AlertTriangle}
          trend={{ value: 5, isUp: false }}
          color={statistics.pendingAlarms > 5 ? 'danger' : 'warning'}
          suffix={
            statistics.pendingAlarms > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-danger-500/20 text-danger-500 text-xs rounded-full animate-pulse">
                待处理
              </span>
            )
          }
        />
        <StatCard
          title="今日巡检数"
          value={statistics.todayInspections}
          unit="次"
          icon={ClipboardCheck}
          trend={{ value: 10, isUp: true }}
          color="primary"
        />
        <StatCard
          title="在施工数"
          value={statistics.inProgressConstructions}
          unit="项"
          icon={HardHat}
          color="warning"
        />
        <StatCard
          title="待处理工单"
          value={statistics.pendingWorkOrders}
          unit="个"
          icon={FileText}
          color="danger"
          suffix={
            statistics.pendingWorkOrders > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-warning-500/20 text-warning-500 text-xs rounded-full">
                待处理
              </span>
            )
          }
        />
      </motion.div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <motion.div variants={itemVariants} className="col-span-8">
          <div className="data-card h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">各舱室实时传感器数据</h2>
              <StatusBadge status="realtime" label="每3秒更新" color="#0ea5e9" pulse />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <AnimatePresence mode="wait">
                {cabinSensorData.map(({ cabin, sensors }, idx) => (
                  <motion.div
                    key={cabin.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      cabin.status === 'danger'
                        ? 'border-danger-500/50 bg-danger-500/5 animate-pulse-border'
                        : cabin.status === 'warning'
                        ? 'border-warning-500/50 bg-warning-500/5'
                        : cabin.status === 'maintenance'
                        ? 'border-purple-500/50 bg-purple-500/5'
                        : cabin.status === 'construction'
                        ? 'border-primary-500/50 bg-primary-500/5'
                        : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-medium">{cabin.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin size={12} className="text-gray-500" />
                          <span className="text-gray-500 text-xs">{cabin.location}</span>
                        </div>
                      </div>
                      <StatusBadge
                        status={cabin.status}
                        label={cabinStatusLabels[cabin.status as keyof typeof cabinStatusLabels]}
                        color={cabinStatusColors[cabin.status as keyof typeof cabinStatusColors]}
                        pulse={cabin.status === 'danger'}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(sensors) as SensorType[]).map((type) => {
                        const data = sensors[type];
                        const Icon = sensorIcons[type];
                        if (!data) {
                          return (
                            <div key={type} className="flex flex-col items-center justify-center p-2 opacity-30">
                              <Icon size={16} className="text-gray-600" />
                              <span className="text-[10px] text-gray-600 mt-1">{sensorTypeLabels[type]}</span>
                              <span className="text-[10px] text-gray-700">--</span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={type}
                            className="flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 hover:bg-gray-700/50"
                          >
                            <GaugeChart
                              value={data.value}
                              max={type === 'temperature' ? 50 : type === 'humidity' ? 100 : type === 'methane' ? 2 : type === 'hydrogenSulfide' ? 30 : type === 'liquidLevel' ? 100 : 3}
                              title=""
                              unit={data.unit}
                              thresholds={sensorThresholds[type]}
                              height={70}
                            />
                            <div className="flex items-center gap-1 mt-1">
                              <Icon size={10} style={{ color: getSensorStatusColor(data.status) }} />
                              <span className="text-[9px] text-gray-400">{sensorTypeLabels[type]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-4">
          <div className="data-card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">实时告警滚动</h2>
              <StatusBadge
                status="pending"
                label={`${sortedAlarms.length} 条待处理`}
                color={sortedAlarms.length > 0 ? '#ef4444' : '#10b981'}
                pulse={sortedAlarms.some((a) => a.level === 'critical' && a.status === 'pending')}
              />
            </div>
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[600px]"
              onMouseEnter={() => setScrollPaused(true)}
              onMouseLeave={() => setScrollPaused(false)}
            >
              <AnimatePresence>
                {sortedAlarms.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-gray-500"
                  >
                    <CheckCircle2 size={48} className="mb-3 text-success-500/50" />
                    <p>当前无待处理告警</p>
                  </motion.div>
                ) : (
                  sortedAlarms.map((alarm, idx) => (
                    <motion.div
                      key={alarm.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        alarm.status === 'pending'
                          ? alarm.level === 'critical'
                            ? 'border-danger-500/50 bg-danger-500/10 hover:bg-danger-500/20'
                            : alarm.level === 'warning'
                            ? 'border-warning-500/50 bg-warning-500/10 hover:bg-warning-500/20'
                            : 'border-primary-500/50 bg-primary-500/10 hover:bg-primary-500/20'
                          : 'border-gray-700 bg-gray-800/30 hover:bg-gray-700/30'
                      }`}
                      onClick={() => alarm.status === 'pending' && handleAcknowledgeAlarm(alarm)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge
                              status={alarm.level}
                              label={alarmLevelLabels[alarm.level]}
                              color={alarmLevelColors[alarm.level]}
                              pulse={alarm.status === 'pending' && alarm.level === 'critical'}
                            />
                            <span className="text-gray-500 text-xs">
                              {mockCabins.find((c) => c.id === alarm.cabinId)?.name}
                            </span>
                          </div>
                          <p className="text-white text-sm font-medium truncate">{alarm.title}</p>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{alarm.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock size={10} />
                              <span>{getTimeAgo(alarm.createdAt)}</span>
                            </div>
                            {alarm.sensorValue !== undefined && (
                              <span>
                                当前值: {alarm.sensorValue} / 阈值: {alarm.threshold}
                              </span>
                            )}
                          </div>
                        </div>
                        {alarm.status === 'pending' && hasPermission('alarm:handle') && (
                          <div className="ml-2 p-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors">
                            <ChevronRight size={16} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <motion.div variants={itemVariants} className="col-span-7">
          <div className="data-card h-full">
            <h2 className="text-lg font-semibold text-white mb-4">24小时温湿度趋势</h2>
            <LineChart
              data={tempHumidityChartData}
              yAxisName="数值"
              height={280}
              threshold={{ warning: 35, danger: 40 }}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-5">
          <div className="data-card h-full">
            <h2 className="text-lg font-semibold text-white mb-4">各舱室告警统计</h2>
            <BarChart data={cabinAlarmChartData} height={280} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
