import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger';
  suffix?: React.ReactNode;
}

const colorMap = {
  primary: 'from-primary-400 to-primary-600',
  success: 'from-success-500 to-green-600',
  warning: 'from-warning-500 to-orange-600',
  danger: 'from-danger-500 to-red-600',
};

export default function StatCard({ title, value, unit, icon: Icon, trend, color = 'primary', suffix }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="data-card"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white number-animate">{value}</span>
            {unit && <span className="text-gray-400 text-sm">{unit}</span>}
            {suffix}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isUp ? 'text-success-500' : 'text-danger-500'}`}>
              <span>{trend.isUp ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 ml-1">较上周</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}
