import {
  mockUsers,
  mockCabins,
  mockSensors,
  mockDevices,
  mockInspectionRoutes,
  mockInspectionRecords,
  mockHazards,
  mockWorkOrders,
  mockConstructionApplies,
  mockMaintenancePlans,
  mockMaintenanceOrders,
  mockPipelineUnits,
  generateSensorData,
  generateAlarms,
  generateStatisticsData,
} from './mock/mockData';
import type {
  User,
  Cabin,
  Sensor,
  SensorData,
  Device,
  Alarm,
  InspectionRoute,
  InspectionRecord,
  Hazard,
  WorkOrder,
  ConstructionApply,
  MaintenancePlan,
  MaintenanceOrder,
  PipelineUnit,
  StatisticsData,
  WorkOrderLog,
} from '@/types/models';
import dayjs from 'dayjs';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  async login(username: string, password: string): Promise<User> {
    await delay(500);
    const user = mockUsers.find((u) => u.username === username);
    if (!user) throw new Error('用户不存在');
    if (password !== '123456') throw new Error('密码错误');
    return user;
  },

  async getCurrentUser(): Promise<User> {
    await delay(200);
    return mockUsers[0];
  },

  async getCabins(): Promise<Cabin[]> {
    await delay(300);
    return mockCabins;
  },

  async getSensors(): Promise<Sensor[]> {
    await delay(300);
    return mockSensors;
  },

  async getSensorData(): Promise<SensorData[]> {
    await delay(100);
    return generateSensorData();
  },

  async getDevices(): Promise<Device[]> {
    await delay(300);
    return mockDevices;
  },

  async controlDevice(deviceId: string, action: 'start' | 'stop', operatorId: string, reason: string): Promise<boolean> {
    await delay(300);
    return true;
  },

  async getAlarms(): Promise<Alarm[]> {
    await delay(300);
    const sensorData = generateSensorData();
    return generateAlarms(sensorData);
  },

  async acknowledgeAlarm(alarmId: string, operatorId: string, operatorName: string): Promise<Alarm> {
    await delay(300);
    const sensorData = generateSensorData();
    const alarms = generateAlarms(sensorData);
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) throw new Error('告警不存在');
    return {
      ...alarm,
      status: 'acknowledged',
      acknowledgedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      acknowledgedBy: operatorId,
      acknowledgedByName: operatorName,
    };
  },

  async escalateAlarm(alarmId: string, escalatedTo: string, escalatedToName: string): Promise<Alarm> {
    await delay(300);
    const sensorData = generateSensorData();
    const alarms = generateAlarms(sensorData);
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) throw new Error('告警不存在');
    return {
      ...alarm,
      escalated: true,
      escalatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      escalatedTo,
      escalatedToName,
    };
  },

  async resolveAlarm(alarmId: string, operatorId: string, resolution: string): Promise<Alarm> {
    await delay(300);
    const sensorData = generateSensorData();
    const alarms = generateAlarms(sensorData);
    const alarm = alarms.find((a) => a.id === alarmId);
    if (!alarm) throw new Error('告警不存在');
    return {
      ...alarm,
      status: 'resolved',
      resolvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      resolvedBy: operatorId,
      resolution,
    };
  },

  async getInspectionRoutes(): Promise<InspectionRoute[]> {
    await delay(300);
    return mockInspectionRoutes;
  },

  async getInspectionRecords(): Promise<InspectionRecord[]> {
    await delay(300);
    return mockInspectionRecords;
  },

  async checkIn(checkPointId: string, inspectorId: string, inspectorName: string): Promise<InspectionRecord> {
    await delay(300);
    const route = mockInspectionRoutes.find((r) =>
      r.checkPoints.some((cp) => cp.id === checkPointId)
    );
    const checkPoint = route?.checkPoints.find((cp) => cp.id === checkPointId);
    return {
      id: `record-${Date.now()}`,
      routeId: route?.id || '',
      routeName: route?.name || '',
      inspectorId,
      inspectorName,
      checkPointId,
      checkPointName: checkPoint?.name || '',
      cabinId: checkPoint?.cabinId || '',
      checkInTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'normal',
    };
  },

  async getHazards(): Promise<Hazard[]> {
    await delay(300);
    return mockHazards;
  },

  async reportHazard(hazard: Omit<Hazard, 'id' | 'status' | 'createdAt'>): Promise<Hazard> {
    await delay(300);
    return {
      ...hazard,
      id: `hazard-${Date.now()}`,
      status: 'reported',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
  },

  async getWorkOrders(): Promise<WorkOrder[]> {
    await delay(300);
    return mockWorkOrders;
  },

  async createWorkOrder(order: Omit<WorkOrder, 'id' | 'orderNo' | 'createdAt' | 'logs'>): Promise<WorkOrder> {
    await delay(300);
    const newLog: WorkOrderLog = {
      id: `log-${Date.now()}`,
      orderId: '',
      action: '工单创建',
      operatorId: order.createdBy,
      operatorName: order.createdByName,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    return {
      ...order,
      id: `wo-${Date.now()}`,
      orderNo: `ZG${dayjs().format('YYYYMM')}${String(mockWorkOrders.length + 1).padStart(3, '0')}`,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      logs: [newLog],
    };
  },

  async updateWorkOrderStatus(
    orderId: string,
    status: WorkOrder['status'],
    operatorId: string,
    operatorName: string,
    remark?: string,
    images?: { after?: string[] }
  ): Promise<WorkOrder> {
    await delay(300);
    const order = mockWorkOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('工单不存在');

    const actionMap: Record<string, string> = {
      processing: '开始处理',
      reviewing: '提交审核',
      completed: '完成工单',
      overdue: '工单超时',
    };

    const newLog: WorkOrderLog = {
      id: `log-${Date.now()}`,
      orderId,
      action: actionMap[status] || '状态更新',
      operatorId,
      operatorName,
      remark,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    return {
      ...order,
      status,
      logs: [...order.logs, newLog],
      completedAt: status === 'completed' ? dayjs().format('YYYY-MM-DD HH:mm:ss') : order.completedAt,
      completedRemark: status === 'completed' ? remark : order.completedRemark,
      images: images ? { ...order.images, ...images } : order.images,
    };
  },

  async getConstructionApplies(): Promise<ConstructionApply[]> {
    await delay(300);
    return mockConstructionApplies;
  },

  async createConstructionApply(apply: Omit<ConstructionApply, 'id' | 'applyNo' | 'status' | 'reminders' | 'createdAt'>): Promise<ConstructionApply> {
    await delay(300);
    return {
      ...apply,
      id: `ca-${Date.now()}`,
      applyNo: `SG${dayjs().format('YYYYMM')}${String(mockConstructionApplies.length + 1).padStart(3, '0')}`,
      status: 'pending',
      reminders: 0,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
  },

  async approveConstructionApply(applyId: string, operatorId: string, operatorName: string): Promise<ConstructionApply> {
    await delay(300);
    const apply = mockConstructionApplies.find((a) => a.id === applyId);
    if (!apply) throw new Error('申请不存在');

    return {
      ...apply,
      status: 'approved',
      approvedBy: operatorId,
      approvedByName: operatorName,
      approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      electronicPass: {
        passNo: `EPASS-${dayjs().format('YYYYMMDD')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        qrCode: `QR-EPASS-${Date.now()}`,
        validFrom: apply.planStartTime,
        validTo: apply.planEndTime,
        lockedArea: apply.constructionArea,
        allowedPersonnel: [apply.applicantName],
      },
    };
  },

  async rejectConstructionApply(applyId: string, operatorId: string, operatorName: string, reason: string): Promise<ConstructionApply> {
    await delay(300);
    const apply = mockConstructionApplies.find((a) => a.id === applyId);
    if (!apply) throw new Error('申请不存在');
    return {
      ...apply,
      status: 'rejected',
      approvedBy: operatorId,
      approvedByName: operatorName,
      approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      rejectReason: reason,
    };
  },

  async startConstruction(applyId: string): Promise<ConstructionApply> {
    await delay(300);
    const apply = mockConstructionApplies.find((a) => a.id === applyId);
    if (!apply) throw new Error('申请不存在');
    return {
      ...apply,
      status: 'inProgress',
      actualStartTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
  },

  async completeConstruction(applyId: string): Promise<ConstructionApply> {
    await delay(300);
    const apply = mockConstructionApplies.find((a) => a.id === applyId);
    if (!apply) throw new Error('申请不存在');
    return {
      ...apply,
      status: 'completed',
      actualEndTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
  },

  async getMaintenancePlans(): Promise<MaintenancePlan[]> {
    await delay(300);
    return mockMaintenancePlans;
  },

  async getMaintenanceOrders(): Promise<MaintenanceOrder[]> {
    await delay(300);
    return mockMaintenanceOrders;
  },

  async updateMaintenanceOrderStatus(
    orderId: string,
    status: MaintenanceOrder['status'],
    operatorId: string,
    operatorName: string,
    remark?: string,
    images?: { after?: string[] }
  ): Promise<MaintenanceOrder> {
    await delay(300);
    const order = mockMaintenanceOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('工单不存在');

    const actionMap: Record<string, string> = {
      processing: '开始维保',
      reviewing: '提交验收',
      completed: '维保完成',
      overdue: '维保超时',
    };

    const newLog: WorkOrderLog = {
      id: `log-${Date.now()}`,
      orderId,
      action: actionMap[status] || '状态更新',
      operatorId,
      operatorName,
      remark,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    return {
      ...order,
      status,
      logs: [...order.logs, newLog],
      completedAt: status === 'completed' ? dayjs().format('YYYY-MM-DD HH:mm:ss') : order.completedAt,
      completedRemark: status === 'completed' ? remark : order.completedRemark,
      images: images ? { ...order.images, ...images } : order.images,
    };
  },

  async escalateMaintenanceOrder(orderId: string, escalatedTo: string): Promise<MaintenanceOrder> {
    await delay(300);
    const order = mockMaintenanceOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('工单不存在');
    return {
      ...order,
      escalated: true,
      escalatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      escalatedTo,
    };
  },

  async getPipelineUnits(): Promise<PipelineUnit[]> {
    await delay(300);
    return mockPipelineUnits;
  },

  async getStatistics(): Promise<StatisticsData> {
    await delay(300);
    return generateStatisticsData();
  },

  async getUsers(): Promise<User[]> {
    await delay(300);
    return mockUsers;
  },
};
