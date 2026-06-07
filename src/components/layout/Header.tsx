import { useState, useEffect } from 'react';
import { Avatar, Dropdown, Badge, Tag, Modal } from 'antd';
import { Bell, LogOut, User, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useAlarmStore } from '@/store/useAlarmStore';
import { alarmLevelColors, alarmLevelLabels, formatTime } from '@/utils/format';

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  supervisor: '运行主管',
  operator: '值班人员',
  inspector: '巡检员',
  maintenance: '维修班组',
  pipelineUser: '管线单位',
};

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const { alarms } = useAlarmStore();
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingAlarms = alarms.filter((a) => a.status === 'pending' || a.status === 'acknowledged');
  const criticalAlarms = pendingAlarms.filter((a) => a.level === 'critical');

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出系统吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: '个人信息',
      onClick: () => {},
    },
    {
      key: 'settings',
      icon: <SettingsIcon size={16} />,
      label: '系统设置',
      onClick: () => navigate('/system/config'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="text-gray-400 text-sm">
          <span className="text-primary-400 font-mono font-medium">
            {currentTime.toLocaleDateString('zh-CN')}
          </span>
          <span className="mx-2">|</span>
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowAlarmModal(true)}
          className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors group"
        >
          <Badge count={criticalAlarms.length} size="small" offset={[-2, 2]}>
            <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors" />
          </Badge>
          {pendingAlarms.length > 0 && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full"
            />
          )}
        </button>

        <div className="h-8 w-px bg-dark-700" />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-dark-700 rounded-lg px-3 py-1.5 transition-colors">
            <Avatar size={32} src={user?.avatar} />
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-white">{user?.name}</div>
              <div className="text-xs text-gray-400">
                <Tag color="blue" className="mr-0 px-1.5 py-0 text-xs">
                  {roleLabels[user?.role || '']}
                </Tag>
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </Dropdown>
      </div>

      <AnimatePresence>
        {showAlarmModal && (
          <Modal
            open={showAlarmModal}
            onCancel={() => setShowAlarmModal(false)}
            footer={null}
            width={600}
            title={
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-warning-500" />
                <span>实时告警通知</span>
                <Tag color="red" className="ml-2">
                  {pendingAlarms.length} 条未处理
                </Tag>
              </div>
            }
          >
            <div className="max-h-96 overflow-y-auto space-y-3">
              {pendingAlarms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bell size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无待处理告警</p>
                </div>
              ) : (
                pendingAlarms.slice(0, 10).map((alarm) => (
                  <motion.div
                    key={alarm.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-lg border border-dark-700 bg-dark-800 hover:border-primary-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: alarmLevelColors[alarm.level] }}
                          />
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: alarmLevelColors[alarm.level] + '20',
                              color: alarmLevelColors[alarm.level],
                            }}
                          >
                            {alarmLevelLabels[alarm.level]}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(alarm.createdAt)}
                          </span>
                        </div>
                        <div className="text-white font-medium text-sm">{alarm.title}</div>
                        <div className="text-gray-400 text-xs mt-1">{alarm.description}</div>
                      </div>
                      {alarm.escalated && (
                        <Tag color="orange" className="flex-shrink-0">已升级</Tag>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </header>
  );
}
