import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Spin } from 'antd';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/login/Login';
import { useUserStore } from '@/store/useUserStore';
import { routes, getDefaultRoute } from '@/router/routes';
import type { RouteConfig } from '@/router/routes';

const LoadingFallback = () => (
  <div className="h-full w-full flex flex-col items-center justify-center gap-4">
    <Spin size="large" />
    <span className="text-gray-400">加载中...</span>
  </div>
);

const componentPathMap: Record<string, () => Promise<any>> = {
  '@/pages/dashboard/Dashboard': () => import('@/pages/dashboard/Dashboard'),
  '@/pages/alarm/AlarmList': () => import('@/pages/alarm/AlarmList'),
  '@/pages/alarm/AlarmHistory': () => import('@/pages/alarm/AlarmHistory'),
  '@/pages/inspection/InspectionRoute': () => import('@/pages/inspection/InspectionRoute'),
  '@/pages/inspection/InspectionRecord': () => import('@/pages/inspection/InspectionRecord'),
  '@/pages/inspection/HazardManagement': () => import('@/pages/inspection/HazardManagement'),
  '@/pages/construction/ConstructionApply': () => import('@/pages/construction/ConstructionApply'),
  '@/pages/construction/ConstructionApprove': () => import('@/pages/construction/ConstructionApprove'),
  '@/pages/construction/ConstructionList': () => import('@/pages/construction/ConstructionList'),
  '@/pages/maintenance/MaintenancePlan': () => import('@/pages/maintenance/MaintenancePlan'),
  '@/pages/maintenance/MaintenanceOrder': () => import('@/pages/maintenance/MaintenanceOrder'),
  '@/pages/statistics/StatisticsOverview': () => import('@/pages/statistics/StatisticsOverview'),
  '@/pages/statistics/ReportExport': () => import('@/pages/statistics/ReportExport'),
  '@/pages/system/UserManagement': () => import('@/pages/system/UserManagement'),
  '@/pages/system/SystemConfig': () => import('@/pages/system/SystemConfig'),
};

const loadComponent = (componentPath: string) => {
  const loader = componentPathMap[componentPath];
  if (loader) {
    return lazy(loader);
  }
  console.warn(`Component not found for path: ${componentPath}`);
  return lazy(() => import('@/components/Empty'));
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const RequirePermission = ({ route, children }: { route: RouteConfig; children: React.ReactNode }) => {
  const { user, checkPermission, checkRole } = useUserStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (route.roles && !checkRole(route.roles)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  if (route.permissions && route.permissions.length > 0) {
    const hasAccess = route.permissions.some((p) => checkPermission(p));
    if (!hasAccess) {
      return <Navigate to={getDefaultRoute(user.role)} replace />;
    }
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useUserStore();
  const location = useLocation();

  useEffect(() => {
    document.title = '智慧城市管廊运维安全管理平台';
  }, [location.pathname]);

  const renderRouteWithLayout = (route: RouteConfig): React.ReactNode => {
    if (route.hidden) return null;

    const Component = route.component ? loadComponent(route.component) : null;

    if (route.children && route.children.length > 0) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={route.children[0].path} replace />} />
          {route.children.map((child) => renderChildRoute(child))}
        </Route>
      );
    }

    if (Component) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <RequireAuth>
              <RequirePermission route={route}>
                <MainLayout>
                  <Suspense fallback={<LoadingFallback />}>
                    <Component />
                  </Suspense>
                </MainLayout>
              </RequirePermission>
            </RequireAuth>
          }
        />
      );
    }

    return null;
  };

  const renderChildRoute = (route: RouteConfig): React.ReactNode => {
    if (route.hidden || !route.component) return null;

    const Component = loadComponent(route.component);

    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          <RequirePermission route={route}>
            <Suspense fallback={<LoadingFallback />}>
              <Component />
            </Suspense>
          </RequirePermission>
        }
      />
    );
  };

  const publicRoutes = routes.filter((r) => r.hidden);
  const privateRoutes = routes.filter((r) => !r.hidden);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={getDefaultRoute(user.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {privateRoutes.map((route) => renderRouteWithLayout(route))}
      <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
