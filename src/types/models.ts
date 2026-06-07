export type RoleType = 'admin' | 'supervisor' | 'operator' | 'inspector' | 'maintenance' | 'pipelineUser';

export type SensorType = 'temperature' | 'humidity' | 'methane' | 'hydrogenSulfide' | 'liquidLevel' | 'waterImmersion';

export type AlarmLevel = 'critical' | 'warning' | 'notice';
export type AlarmType = 'environment' | 'device' | 'construction' | 'hazard';
export type AlarmStatus = 'pending' | 'acknowledged' | 'processing' | 'resolved' | 'closed';

export type WorkOrderType = 'rectify' | 'maintenance' | 'construction';
export type WorkOrderLevel = 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'pending' | 'processing' | 'reviewing' | 'completed' | 'overdue' | 'escalated';

export type ConstructionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inProgress' | 'completed' | 'overdue';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  username: string;
  name: string;
  role: RoleType;
  pipelineUnitId?: string;
  pipelineUnitName?: string;
  permissions: string[];
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface Cabin {
  id: string;
  name: string;
  code: string;
  location: string;
  length: number;
  pipelineTypes: string[];
  status: 'normal' | 'warning' | 'danger' | 'maintenance' | 'construction';
  sensorCount: number;
  deviceCount: number;
}

export interface Sensor {
  id: string;
  cabinId: string;
  name: string;
  type: SensorType;
  location: string;
  status: 'online' | 'offline' | 'fault';
  threshold: {
    warning: number;
    danger: number;
  };
  unit: string;
}

export interface SensorData {
  id: string;
  sensorId: string;
  cabinId: string;
  sensorType: SensorType;
  value: number;
  unit: string;
  threshold: {
    warning: number;
    danger: number;
  };
  status: 'normal' | 'warning' | 'danger';
  timestamp: string;
}

export interface Device {
  id: string;
  cabinId: string;
  name: string;
  type: 'fan' | 'pump' | 'light' | 'door' | 'camera';
  status: 'running' | 'stopped' | 'fault' | 'auto';
  location: string;
  lastMaintenance: string;
  nextMaintenance: string;
}

export interface DeviceAction {
  deviceId: string;
  deviceName: string;
  action: 'start' | 'stop';
  executedAt: string;
  executedBy: string;
  reason: string;
}

export interface Alarm {
  id: string;
  sensorId?: string;
  cabinId: string;
  alarmType: AlarmType;
  level: AlarmLevel;
  title: string;
  description: string;
  sensorValue?: number;
  threshold?: number;
  status: AlarmStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  escalated: boolean;
  escalatedAt?: string;
  escalatedTo?: string;
  escalatedToName?: string;
  linkedDeviceAction?: DeviceAction;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface InspectionRoute {
  id: string;
  name: string;
  code: string;
  cabinIds: string[];
  checkPoints: CheckPoint[];
  cycleDays: number;
  assignedInspectorIds: string[];
  status: 'active' | 'inactive';
}

export interface CheckPoint {
  id: string;
  name: string;
  code: string;
  location: string;
  qrCode: string;
  cabinId: string;
  order: number;
  requiredItems: string[];
}

export interface InspectionRecord {
  id: string;
  routeId: string;
  routeName: string;
  inspectorId: string;
  inspectorName: string;
  checkPointId: string;
  checkPointName: string;
  cabinId: string;
  checkInTime: string;
  status: 'normal' | 'abnormal';
  remark?: string;
}

export interface Hazard {
  id: string;
  inspectionRecordId?: string;
  reporterId: string;
  reporterName: string;
  cabinId: string;
  location: string;
  level: WorkOrderLevel;
  type: 'structure' | 'device' | 'environment' | 'other';
  title: string;
  description: string;
  images: string[];
  status: 'reported' | 'rectifying' | 'completed' | 'closed';
  createdAt: string;
  rectifyOrderId?: string;
}

export interface WorkOrderLog {
  id: string;
  orderId: string;
  action: string;
  operatorId: string;
  operatorName: string;
  remark?: string;
  timestamp: string;
}

export interface WorkOrder {
  id: string;
  orderNo: string;
  type: WorkOrderType;
  title: string;
  description: string;
  level: WorkOrderLevel;
  status: WorkOrderStatus;
  cabinId: string;
  cabinName?: string;
  area?: string;
  assigneeId: string;
  assigneeName: string;
  deadline: string;
  images?: {
    before?: string[];
    after?: string[];
  };
  hazardId?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  completedAt?: string;
  completedRemark?: string;
  logs: WorkOrderLog[];
  constructionSuspended?: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  affectedPipelines: string[];
  suggestedTimePeriod: string;
  riskPoints: string[];
}

export interface ElectronicPass {
  passNo: string;
  qrCode: string;
  validFrom: string;
  validTo: string;
  lockedArea: string;
  allowedPersonnel: string[];
}

export interface ConstructionApply {
  id: string;
  applyNo: string;
  applicantUnit: string;
  applicantName: string;
  applicantPhone: string;
  pipelineUnitId?: string;
  projectName: string;
  constructionType: string;
  cabinId: string;
  cabinName?: string;
  constructionArea: string;
  planStartTime: string;
  planEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  constructionScheme?: string;
  safetyCommitment?: string;
  riskAssessment: RiskAssessment;
  status: ConstructionStatus;
  electronicPass?: ElectronicPass;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  reminders: number;
  createdAt: string;
}

export interface MaintenancePlan {
  id: string;
  name: string;
  deviceType: string;
  cabinIds: string[];
  cycleDays: number;
  lastGenerated: string;
  nextGenerate: string;
  assignedTeamId: string;
  assignedTeamName: string;
  status: 'active' | 'inactive';
  content: string;
}

export interface MaintenanceOrder {
  id: string;
  orderNo: string;
  planId: string;
  planName: string;
  cabinId: string;
  cabinName?: string;
  deviceIds: string[];
  deviceNames: string[];
  teamId: string;
  teamName: string;
  assigneeId: string;
  assigneeName: string;
  status: WorkOrderStatus;
  level: WorkOrderLevel;
  content: string;
  deadline: string;
  images?: {
    before?: string[];
    after?: string[];
  };
  createdAt: string;
  completedAt?: string;
  completedRemark?: string;
  logs: WorkOrderLog[];
  escalated: boolean;
  escalatedAt?: string;
  escalatedTo?: string;
}

export interface StatisticsData {
  environmentComplianceRate: number;
  deviceIntactRate: number;
  hazardRectificationProgress: number;
  constructionOccupancy: number;
  alarmCount: {
    today: number;
    week: number;
    month: number;
  };
  workOrderCount: {
    pending: number;
    processing: number;
    completed: number;
    overdue: number;
  };
  cabinStatus: {
    normal: number;
    warning: number;
    danger: number;
    maintenance: number;
    construction: number;
  };
}

export interface PipelineUnit {
  id: string;
  name: string;
  type: 'electric' | 'communication' | 'gas' | 'waterSupply' | 'drainage';
  contactPerson: string;
  contactPhone: string;
}
