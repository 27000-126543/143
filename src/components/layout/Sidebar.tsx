import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle,
  Route,
  HardHat,
  Wrench,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { routes, RouteConfig } from '@/router/routes';
import { usePermission } from '@/hooks/usePermission';
import { useGlobalStore } from '@/store/useGlobalStore';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  AlertTriangle,
  Route,
  HardHat,
  Wrench,
  BarChart3,
  Settings,
};

export default function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useGlobalStore();
  const { hasPermission, hasRole } = usePermission();
  const [openMenus, setOpenMenus] = useState<string[]>(['/alarm', '/inspection', '/construction', '/maintenance', '/statistics', '/system']);

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const filterRoutes = (routes: RouteConfig[]): RouteConfig[] => {
    return routes.filter((route) => {
      if (route.hidden) return false;
      if (route.roles && !hasRole(route.roles)) return false;
      if (route.permissions && !route.permissions.some((p) => hasPermission(p))) return false;
      if (route.children) {
        route.children = filterRoutes(route.children);
        return route.children.length > 0;
      }
      return true;
    });
  };

  const filteredRoutes = filterRoutes(routes);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (route: RouteConfig, level: number = 0) => {
    const Icon = route.icon ? iconMap[route.icon] : null;
    const active = isActive(route.path);
    const hasChildren = route.children && route.children.length > 0;
    const isOpen = openMenus.includes(route.path);

    if (hasChildren) {
      return (
        <div key={route.path}>
          <button
            onClick={() => toggleMenu(route.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            }`}
          >
            {Icon && <Icon size={20} />}
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">{route.name}</span>
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.div
                      key="down"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={16} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="right"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </button>
          {!sidebarCollapsed && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {route.children?.map((child) => renderMenuItem(child, level + 1))}
            </motion.div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={route.path}
        to={route.path}
        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
          level > 0 ? 'pl-12' : ''
        } ${
          active
            ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500'
            : 'text-gray-400 hover:bg-dark-700 hover:text-white border-l-2 border-transparent'
        }`}
      >
        {Icon && level === 0 && <Icon size={20} />}
        {!sidebarCollapsed && <span>{route.name}</span>}
      </NavLink>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-dark-800 border-r border-dark-700 flex flex-col overflow-hidden"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <span className="font-bold text-white font-mono">管廊运维</span>
          </motion.div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredRoutes.map((route) => renderMenuItem(route))}
      </nav>
    </motion.aside>
  );
}
