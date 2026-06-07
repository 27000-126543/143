import * as XLSX from 'xlsx';
import type { Alarm, WorkOrder, ConstructionApply, MaintenanceOrder, StatisticsData } from '@/types/models';
import {
  alarmLevelLabels,
  workOrderLevelLabels,
  workOrderStatusLabels,
  constructionStatusLabels,
  formatDateTime,
} from './format';
import dayjs from 'dayjs';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

export const exportToExcel = <T>(data: T[], columns: { key: keyof T | string; title: string; formatter?: (value: any, row: T) => string }[], options: ExportOptions = {}) => {
  const { filename = 'export.xlsx', sheetName = 'Sheet1' } = options;
  
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, any> = {};
    columns.forEach((col) => {
      const key = col.key as string;
      const value = row[col.key as keyof T];
      formattedRow[col.title] = col.formatter ? col.formatter(value, row) : value;
    });
    return formattedRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
};

export const exportAlarms = (alarms: Alarm[]) => {
  const columns = [
    { key: 'id', title: '告警ID' },
    { key: 'level', title: '告警级别', formatter: (v: string) => alarmLevelLabels[v as keyof typeof alarmLevelLabels] || v },
    { key: 'title', title: '告警标题' },
    { key: 'description', title: '告警描述' },
    { key: 'sensorValue', title: '当前值' },
    { key: 'threshold', title: '阈值' },
    { key: 'status', title: '状态' },
    { key: 'acknowledgedByName', title: '确认人' },
    { key: 'acknowledgedAt', title: '确认时间', formatter: (v: string) => v || '-' },
    { key: 'createdAt', title: '创建时间', formatter: (v: string) => formatDateTime(v) },
    { key: 'resolvedAt', title: '解决时间', formatter: (v: string) => v || '-' },
  ];

  exportToExcel(alarms, columns, {
    filename: `告警列表_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
    sheetName: '告警列表',
  });
};

export const exportWorkOrders = (orders: WorkOrder[]) => {
  const columns = [
    { key: 'orderNo', title: '工单号' },
    { key: 'type', title: '工单类型', formatter: (v: string) => ({ rectify: '整改工单', maintenance: '维保工单', construction: '施工工单' }[v] || v) },
    { key: 'level', title: '优先级', formatter: (v: string) => workOrderLevelLabels[v as keyof typeof workOrderLevelLabels] || v },
    { key: 'title', title: '工单标题' },
    { key: 'description', title: '工单描述' },
    { key: 'cabinName', title: '所属舱段' },
    { key: 'assigneeName', title: '负责人' },
    { key: 'status', title: '状态', formatter: (v: string) => workOrderStatusLabels[v as keyof typeof workOrderStatusLabels] || v },
    { key: 'deadline', title: '截止时间', formatter: (v: string) => formatDateTime(v) },
    { key: 'createdByName', title: '创建人' },
    { key: 'createdAt', title: '创建时间', formatter: (v: string) => formatDateTime(v) },
    { key: 'completedAt', title: '完成时间时间', formatter: (v: string) => v || '-' },
  ];

  exportToExcel(orders, columns, {
    filename: `工单明细_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
    sheetName: '工单明细',
  });
};

export const exportConstructionApplies = (applies: ConstructionApply[]) => {
  const columns = [
    { key: 'applyNo', title: '申请编号' },
    { key: 'applicantUnit', title: '申请单位' },
    { key: 'applicantName', title: '申请人' },
    { key: 'projectName', title: '工程名称' },
    { key: 'cabinName', title: '作业舱段' },
    { key: 'constructionArea', title: '作业区域' },
    { key: 'planStartTime', title: '计划开始时间', formatter: (v: string) => formatDateTime(v) },
    { key: 'planEndTime', title: '计划结束时间时间', formatter: (v: string) => formatDateTime(v) },
    { key: 'status', title: '状态', formatter: (v: string) => constructionStatusLabels[v as keyof typeof constructionStatusLabels] || v },
    { key: 'approvedByName', title: '审核人' },
    { key: 'createdAt', title: '创建时间时间', formatter: (v: string) => formatDateTime(v) },
  ];

  exportToExcel(applies, columns, {
    filename: `施工记录_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
    sheetName: '施工记录',
  });
};

export const exportMonthlyReport = (statistics: StatisticsData, alarms: Alarm[], orders: WorkOrder[], constructions: ConstructionApply[], maintenanceOrders: MaintenanceOrder[]) => {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    { '指标名称': '环境达标率', '数值': `${statistics.environmentComplianceRate}%` },
    { '指标名称': '设备完好率', '数值': `${statistics.deviceIntactRate}%` },
    { '指标名称': '隐患整改进度', '数值': `${statistics.hazardRectificationProgress}%` },
    { '指标名称': '施工占用量', '数值': `${statistics.constructionOccupancy}%` },
    { '指标名称': '本月告警数', '数值': statistics.alarmCount.month },
    { '指标名称': '待处理工单数', '数值': statistics.workOrderCount.pending },
    { '指标名称': '处理中工单数', '数值': statistics.workOrderCount.processing },
    { '指标名称': '已完成工单数', '数值': statistics.workOrderCount.completed },
    { '指标名称': '超时工单数', '数值': statistics.workOrderCount.overdue },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '运维概览');

  const alarmData = alarms.map((a) => ({
    '告警ID': a.id,
    '级别': alarmLevelLabels[a.level],
    '标题': a.title,
    '状态': a.status,
    '创建时间时间': formatDateTime(a.createdAt),
    '处理人': a.acknowledgedByName || '-',
  }));
  const alarmSheet = XLSX.utils.json_to_sheet(alarmData);
  XLSX.utils.book_append_sheet(workbook, alarmSheet, '告警记录');

  const orderData = orders.map((o) => ({
    '工单号': o.orderNo,
    '类型': { rectify: '整改工单', maintenance: '维保工单', construction: '施工工单' }[o.type],
    '标题': o.title,
    '优先级': workOrderLevelLabels[o.level],
    '状态': workOrderStatusLabels[o.status],
    '负责人': o.assigneeName,
    '创建时间时间': formatDateTime(o.createdAt),
    '截止时间时间': formatDateTime(o.deadline),
  }));
  const orderSheet = XLSX.utils.json_to_sheet(orderData);
  XLSX.utils.book_append_sheet(workbook, orderSheet, '工单明细');

  const constructionData = constructions.map((c) => ({
    '申请编号': c.applyNo,
    '申请单位': c.applicantUnit,
    '工程名称': c.projectName,
    '作业舱段': c.cabinName,
    '计划开始时间时间': formatDateTime(c.planStartTime),
    '状态': constructionStatusLabels[c.status],
  }));
  const constructionSheet = XLSX.utils.json_to_sheet(constructionData);
  XLSX.utils.book_append_sheet(workbook, constructionSheet, '施工记录');

  XLSX.writeFile(workbook, `月度运维分析报表_${dayjs().format('YYYYMM')}.xlsx`);
};
