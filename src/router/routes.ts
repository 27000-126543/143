import type { RoleType } from '@/types/models';

export interface RouteConfig {
  path: string;
  name: string;
  icon?: string;
  component?: string;
  roles?: RoleType[];
  permissions?: string[];
  children?: RouteConfig[];
  hidden?: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: '/login',
    name: '登录',
    component: '@/pages/login/Login',
    hidden: true,
  },
  {
    path: '/dashboard',
    name: '监控大屏',
    icon: 'LayoutDashboard',
    component: '@/pages/dashboard/Dashboard',
    roles: ['admin', 'supervisor', 'operator'],
    permissions: ['dashboard:view'],
  },
  {
    path: '/alarm',
    name: '告警管理',
    icon: 'AlertTriangle',
    roles: ['admin', 'supervisor', 'operator'],
    children: [
      {
        path: '/alarm/list',
        name: '告警列表',
        component: '@/pages/alarm/AlarmList',
        permissions: ['alarm:view', 'alarm:handle'],
      },
      {
        path: '/alarm/history',
        name: '告警历史',
        component: '@/pages/alarm/AlarmHistory',
        permissions: ['alarm:view'],
      },
    ],
  },
  {
    path: '/inspection',
    name: '巡检管理',
    icon: 'Route',
    roles: ['admin', 'supervisor', 'inspector'],
    children: [
      {
        path: '/inspection/route',
        name: '巡检路线',
        component: '@/pages/inspection/InspectionRoute',
        permissions: ['inspection:view'],
      },
      {
        path: '/inspection/record',
        name: '打卡记录',
        component: '@/pages/inspection/InspectionRecord',
        permissions: ['inspection:view', 'inspection:checkin'],
      },
      {
        path: '/inspection/hazard',
        name: '隐患管理',
        component: '@/pages/inspection/HazardManagement',
        permissions: ['hazard:view', 'hazard:report', 'hazard:rectify'],
      },
    ],
  },
  {
    path: '/construction',
    name: '施工管理',
    icon: 'HardHat',
    roles: ['admin', 'supervisor', 'pipelineUser'],
    children: [
      {
        path: '/construction/apply',
        name: '施工申请',
        component: '@/pages/construction/ConstructionApply',
        permissions: ['construction:apply'],
      },
      {
        path: '/construction/approve',
        name: '施工审批',
        component: '@/pages/construction/ConstructionApprove',
        permissions: ['construction:approve'],
      },
      {
        path: '/construction/list',
        name: '施工列表',
        component: '@/pages/construction/ConstructionList',
        permissions: ['construction:view', 'construction:my'],
      },
    ],
  },
  {
    path: '/maintenance',
    name: '设备维保',
    icon: 'Wrench',
    roles: ['admin', 'supervisor', 'maintenance'],
    children: [
      {
        path: '/maintenance/plan',
        name: '维保计划',
        component: '@/pages/maintenance/MaintenancePlan',
        permissions: ['maintenance:view'],
      },
      {
        path: '/maintenance/order',
        name: '维保工单',
        component: '@/pages/maintenance/MaintenanceOrder',
        permissions: ['maintenance:view', 'maintenance:execute', 'maintenance:complete'],
      },
    ],
  },
  {
    path: '/statistics',
    name: '统计分析',
    icon: 'BarChart3',
    roles: ['admin', 'supervisor'],
    children: [
      {
        path: '/statistics/overview',
        name: '统计总览',
        component: '@/pages/statistics/StatisticsOverview',
        permissions: ['statistics:view'],
      },
      {
        path: '/statistics/report',
        name: '报表导出',
        component: '@/pages/statistics/ReportExport',
        permissions: ['statistics:export'],
      },
    ],
  },
  {
    path: '/system',
    name: '系统管理',
    icon: 'Settings',
    roles: ['admin'],
    children: [
      {
        path: '/system/user',
        name: '用户管理',
        component: '@/pages/system/UserManagement',
        permissions: ['system:user'],
      },
      {
        path: '/system/config',
        name: '系统配置',
        component: '@/pages/system/SystemConfig',
        permissions: ['system:config'],
      },
    ],
  },
];

export const getDefaultRoute = (role: RoleType): string => {
  const routeMap: Record<RoleType, string> = {
    admin: '/dashboard',
    supervisor: '/dashboard',
    operator: '/dashboard',
    inspector: '/inspection/record',
    maintenance: '/maintenance/order',
    pipelineUser: '/construction/apply',
  };
  return routeMap[role] || '/dashboard';
};
