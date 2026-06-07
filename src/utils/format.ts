import dayjs from 'dayjs';
import type { SensorType, AlarmLevel, WorkOrderLevel, RiskLevel, WorkOrderStatus, ConstructionStatus } from '@/types/models';

export const sensorTypeLabels: Record<SensorType, string> = {
  temperature: '温度',
  humidity: '湿度',
  methane: '甲烷',
  hydrogenSulfide: '硫化氢',
  liquidLevel: '液位',
  waterImmersion: '水浸',
};

export const alarmLevelLabels: Record<AlarmLevel, string> = {
  critical: '严重',
  warning: '警告',
  notice: '提示',
};

export const alarmLevelColors: Record<AlarmLevel, string> = {
  critical: '#ef4444',
  warning: '#f97316',
  notice: '#3b82f6',
};

export const workOrderLevelLabels: Record<WorkOrderLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const workOrderLevelColors: Record<WorkOrderLevel, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#10b981',
};

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  reviewing: '审核中',
  completed: '已完成',
  overdue: '已超时',
  escalated: '已升级',
};

export const workOrderStatusColors: Record<WorkOrderStatus, string> = {
  pending: '#f97316',
  processing: '#3b82f6',
  reviewing: '#8b5cf6',
  completed: '#10b981',
  overdue: '#ef4444',
  escalated: '#dc2626',
};

export const constructionStatusLabels: Record<ConstructionStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  inProgress: '施工中',
  completed: '已完成',
  overdue: '已超时',
};

export const constructionStatusColors: Record<ConstructionStatus, string> = {
  draft: '#64748b',
  pending: '#f97316',
  approved: '#10b981',
  rejected: '#ef4444',
  inProgress: '#3b82f6',
  completed: '#0ea5e9',
  overdue: '#dc2626',
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const riskLevelColors: Record<RiskLevel, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#10b981',
};

export const cabinStatusLabels = {
  normal: '正常',
  warning: '预警',
  danger: '告警',
  maintenance: '维保中',
  construction: '施工中',
};

export const cabinStatusColors = {
  normal: '#10b981',
  warning: '#f97316',
  danger: '#ef4444',
  maintenance: '#8b5cf6',
  construction: '#3b82f6',
};

export const deviceTypeLabels = {
  fan: '排风机',
  pump: '水泵',
  light: '照明',
  door: '防火门',
  camera: '摄像机',
};

export const deviceStatusLabels = {
  running: '运行中',
  stopped: '已停止',
  fault: '故障',
  auto: '自动',
};

export const deviceStatusColors = {
  running: '#10b981',
  stopped: '#64748b',
  fault: '#ef4444',
  auto: '#0ea5e9',
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm:ss');
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
};

export const getTimeAgo = (date: string | Date): string => {
  const diff = dayjs().diff(dayjs(date), 'minute');
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟前`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};

export const getCountdown = (deadline: string | Date): { text: string; urgent: boolean; overdue: boolean } => {
  const now = dayjs();
  const end = dayjs(deadline);
  const diffMinutes = end.diff(now, 'minute');
  
  if (diffMinutes < 0) {
    const absDiff = Math.abs(diffMinutes);
    const hours = Math.floor(absDiff / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return { text: `已超时${days}天`, urgent: true, overdue: true };
    if (hours > 0) return { text: `已超时${hours}小时`, urgent: true, overdue: true };
    return { text: `已超时${absDiff}分钟`, urgent: true, overdue: true };
  }
  
  const hours = Math.floor(diffMinutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return { text: `剩余${days}天`, urgent: days < 1, overdue: false };
  if (hours > 0) return { text: `剩余${hours}小时`, urgent: hours < 4, overdue: false };
  return { text: `剩余${diffMinutes}分钟`, urgent: true, overdue: false };
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals);
};

export const formatPercent = (num: number, decimals: number = 1): string => {
  return `${num.toFixed(decimals)}%`;
};

export const getSensorStatusColor = (status: 'normal' | 'warning' | 'danger'): string => {
  const colors = {
    normal: '#10b981',
    warning: '#f97316',
    danger: '#ef4444',
  };
  return colors[status];
};
