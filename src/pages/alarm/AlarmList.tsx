import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Form,
  Modal,
  Input,
  message,
  Tag,
  Row,
  Col,
  Card,
} from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import StatusBadge from '@/components/common/StatusBadge';
import { useAlarmStore } from '@/store/useAlarmStore';
import { usePermission } from '@/hooks/usePermission';
import type { Alarm, AlarmLevel, AlarmStatus, AlarmType } from '@/types/models';
import {
  alarmLevelLabels,
  alarmLevelColors,
  formatDateTime,
  formatNumber,
  sensorTypeLabels,
} from '@/utils/format';
import { mockCabins, mockSensors } from '@/services/mock/mockData';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const alarmStatusLabels: Record<AlarmStatus, string> = {
  pending: '待处理',
  acknowledged: '已确认',
  processing: '处理中',
  resolved: '已消除',
  closed: '已关闭',
};

const alarmStatusColors: Record<AlarmStatus, string> = {
  pending: '#ef4444',
  acknowledged: '#f97316',
  processing: '#3b82f6',
  resolved: '#10b981',
  closed: '#64748b',
};

const alarmTypeLabels: Record<AlarmType, string> = {
  environment: '环境告警',
  device: '设备告警',
  construction: '施工告警',
  hazard: '隐患告警',
};

const ESCALATE_THRESHOLD_MINUTES = 15;

export default function AlarmList() {
  const { alarms, loading, fetchAlarms, acknowledgeAlarm, escalateAlarm, resolveAlarm } = useAlarmStore();
  const { user, hasPermission } = usePermission();
  const [form] = Form.useForm();
  const [currentAlarm, setCurrentAlarm] = useState<Alarm | null>(null);
  const [ackModalVisible, setAckModalVisible] = useState(false);
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolution, setResolution] = useState('');
  const [escalatedTo, setEscalatedTo] = useState('');
  const [escalatedToName, setEscalatedToName] = useState('');

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(() => {
      fetchAlarms();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAlarms]);

  const activeAlarms = useMemo(() => {
    return alarms.filter((a) => a.status === 'pending' || a.status === 'acknowledged' || a.status === 'processing');
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    const values = form.getFieldsValue();
    return activeAlarms.filter((alarm) => {
      if (values.level && alarm.level !== values.level) return false;
      if (values.cabinId && alarm.cabinId !== values.cabinId) return false;
      if (values.timeRange && values.timeRange.length === 2) {
        const alarmTime = dayjs(alarm.createdAt);
        if (alarmTime.isBefore(values.timeRange[0]) || alarmTime.isAfter(values.timeRange[1])) return false;
      }
      return true;
    });
  }, [activeAlarms, form]);

  const getCountdownInfo = (alarm: Alarm) => {
    if (alarm.status !== 'pending') return null;
    const createdAt = dayjs(alarm.createdAt);
    const now = dayjs();
    const diffMinutes = now.diff(createdAt, 'minute');
    const remaining = ESCALATE_THRESHOLD_MINUTES - diffMinutes;

    if (remaining <= 0) {
      return {
        text: `已超时${Math.abs(remaining)}分钟`,
        urgent: true,
        color: '#dc2626',
      };
    }
    return {
      text: `剩余${remaining}分钟`,
      urgent: remaining < 5,
      color: remaining < 5 ? '#ef4444' : remaining < 10 ? '#f97316' : '#3b82f6',
    };
  };

  const getSensorName = (sensorId?: string) => {
    if (!sensorId) return '-';
    const sensor = mockSensors.find((s) => s.id === sensorId);
    if (!sensor) return sensorId;
    const typeLabel = sensorTypeLabels[sensor.type] || sensor.type;
    return `${typeLabel}传感器`;
  };

  const getCabinName = (cabinId: string) => {
    const cabin = mockCabins.find((c) => c.id === cabinId);
    return cabin?.name || cabinId;
  };

  const handleAcknowledge = async () => {
    if (!currentAlarm || !user) return;
    try {
      await acknowledgeAlarm(currentAlarm.id, user.id, user.name);
      message.success('告警已确认');
      setAckModalVisible(false);
      setCurrentAlarm(null);
    } catch (error) {
      message.error('确认失败');
    }
  };

  const handleEscalate = async () => {
    if (!currentAlarm || !escalatedTo || !escalatedToName) {
      message.warning('请选择升级对象');
      return;
    }
    try {
      await escalateAlarm(currentAlarm.id, escalatedTo, escalatedToName);
      message.success('告警已升级');
      setEscalateModalVisible(false);
      setCurrentAlarm(null);
      setEscalatedTo('');
      setEscalatedToName('');
    } catch (error) {
      message.error('升级失败');
    }
  };

  const handleResolve = async () => {
    if (!currentAlarm || !resolution.trim()) {
      message.warning('请填写处理结果');
      return;
    }
    if (!user) return;
    try {
      await resolveAlarm(currentAlarm.id, user.id, resolution.trim());
      message.success('告警已消除');
      setResolveModalVisible(false);
      setCurrentAlarm(null);
      setResolution('');
    } catch (error) {
      message.error('消除失败');
    }
  };

  const openAckModal = (alarm: Alarm) => {
    setCurrentAlarm(alarm);
    setAckModalVisible(true);
  };

  const openEscalateModal = (alarm: Alarm) => {
    setCurrentAlarm(alarm);
    setEscalateModalVisible(true);
  };

  const openResolveModal = (alarm: Alarm) => {
    setCurrentAlarm(alarm);
    setResolveModalVisible(true);
  };

  const columns: ColumnsType<Alarm> = [
    {
      title: '告警时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => formatDateTime(text),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '告警等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: AlarmLevel, record) => (
        <StatusBadge
          status={level}
          label={alarmLevelLabels[level]}
          color={alarmLevelColors[level]}
          pulse={level === 'critical'}
        />
      ),
      filters: [
        { text: '严重', value: 'critical' },
        { text: '警告', value: 'warning' },
        { text: '提示', value: 'notice' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '告警类型',
      dataIndex: 'alarmType',
      key: 'alarmType',
      width: 120,
      render: (type: AlarmType) => alarmTypeLabels[type] || type,
    },
    {
      title: '所属舱室',
      dataIndex: 'cabinId',
      key: 'cabinId',
      width: 140,
      render: (cabinId: string) => getCabinName(cabinId),
    },
    {
      title: '传感器',
      dataIndex: 'sensorId',
      key: 'sensorId',
      width: 150,
      render: (sensorId?: string) => getSensorName(sensorId),
    },
    {
      title: '当前值',
      dataIndex: 'sensorValue',
      key: 'sensorValue',
      width: 100,
      render: (value: number | undefined, record: Alarm) => {
        if (value === undefined || value === null) return '-';
        const sensor = mockSensors.find((s) => s.id === record.sensorId);
        return (
          <span style={{ color: alarmLevelColors[record.level] }}>
            {formatNumber(value)}{sensor?.unit || ''}
          </span>
        );
      },
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 100,
      render: (value: number | undefined, record: Alarm) => {
        if (value === undefined || value === null) return '-';
        const sensor = mockSensors.find((s) => s.id === record.sensorId);
        return `${value}${sensor?.unit || ''}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: AlarmStatus, record) => {
        const countdown = getCountdownInfo(record);
        return (
          <Space direction="vertical" size={4}>
            <StatusBadge
              status={status}
              label={alarmStatusLabels[status]}
              color={alarmStatusColors[status]}
              pulse={status === 'pending' && record.level === 'critical'}
            />
            {countdown && (
              <Tag
                color={countdown.urgent ? 'red' : 'blue'}
                style={{
                  margin: 0,
                  animation: countdown.urgent ? 'pulse 1s infinite' : 'none',
                }}
              >
                {countdown.text}自动升级
              </Tag>
            )}
            {record.escalated && (
              <Tag color="orange">已升级</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const canHandle = hasPermission('alarm:handle');
        return (
          <Space size="small">
            {record.status === 'pending' && canHandle && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => openAckModal(record)}
              >
                确认
              </Button>
            )}
            {(record.status === 'pending' || record.status === 'acknowledged') && canHandle && (
              <Button
                type="default"
                size="small"
                danger
                icon={<ArrowUpOutlined />}
                onClick={() => openEscalateModal(record)}
              >
                升级
              </Button>
            )}
            {(record.status === 'acknowledged' || record.status === 'processing') && canHandle && (
              <Button
                type="default"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => openResolveModal(record)}
              >
                消除
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const stats = useMemo(() => {
    const pending = activeAlarms.filter((a) => a.status === 'pending').length;
    const critical = activeAlarms.filter((a) => a.level === 'critical').length;
    const processing = activeAlarms.filter((a) => a.status === 'processing').length;
    const escalated = activeAlarms.filter((a) => a.escalated).length;
    return { pending, critical, processing, escalated };
  }, [activeAlarms]);

  return (
    <div className="p-6">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">待处理</span>
              <WarningOutlined className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500 mt-2">{stats.pending}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">严重告警</span>
              <WarningOutlined className="text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">{stats.critical}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">处理中</span>
              <CheckCircleOutlined className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500 mt-2">{stats.processing}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已升级</span>
              <ArrowUpOutlined className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500 mt-2">{stats.escalated}</div>
          </Card>
        </Col>
      </Row>

      <Card className="bg-gray-800 border-gray-700 mb-4">
        <Form form={form} layout="inline" onFinish={() => {}}>
          <Form.Item name="level" label="告警等级">
            <Select placeholder="全部等级" allowClear style={{ width: 140 }}>
              <Option value="critical">严重</Option>
              <Option value="warning">警告</Option>
              <Option value="notice">提示</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cabinId" label="所属舱室">
            <Select placeholder="全部舱室" allowClear style={{ width: 160 }}>
              {mockCabins.map((cabin) => (
                <Option key={cabin.id} value={cabin.id}>{cabin.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="timeRange" label="时间范围">
            <RangePicker showTime style={{ width: 320 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
                重置
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchAlarms}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={filteredAlarms}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="确认告警"
        open={ackModalVisible}
        onOk={handleAcknowledge}
        onCancel={() => {
          setAckModalVisible(false);
          setCurrentAlarm(null);
        }}
        okText="确认"
        cancelText="取消"
      >
        <p>确认要处理此告警吗？</p>
        {currentAlarm && (
          <div className="bg-gray-700 p-4 rounded mt-4">
            <p><strong>告警标题：</strong>{currentAlarm.title}</p>
            <p><strong>告警等级：</strong>{alarmLevelLabels[currentAlarm.level]}</p>
            <p><strong>所属舱室：</strong>{getCabinName(currentAlarm.cabinId)}</p>
          </div>
        )}
      </Modal>

      <Modal
        title="升级告警"
        open={escalateModalVisible}
        onOk={handleEscalate}
        onCancel={() => {
          setEscalateModalVisible(false);
          setCurrentAlarm(null);
          setEscalatedTo('');
          setEscalatedToName('');
        }}
        okText="升级"
        cancelText="取消"
      >
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">选择升级对象</label>
          <Select
            placeholder="请选择升级对象"
            style={{ width: '100%' }}
            value={escalatedTo || undefined}
            onChange={(value, option) => {
              setEscalatedTo(value);
              const opt = Array.isArray(option) ? option[0] : option;
              setEscalatedToName((opt?.label as string) || '');
            }}
          >
            <Option value="2" label="李主管">李主管（主管）</Option>
            <Option value="1" label="张管理员">张管理员（管理员）</Option>
          </Select>
        </div>
        {currentAlarm && (
          <div className="bg-gray-700 p-4 rounded">
            <p><strong>告警标题：</strong>{currentAlarm.title}</p>
            <p><strong>告警等级：</strong>{alarmLevelLabels[currentAlarm.level]}</p>
          </div>
        )}
      </Modal>

      <Modal
        title="消除告警"
        open={resolveModalVisible}
        onOk={handleResolve}
        onCancel={() => {
          setResolveModalVisible(false);
          setCurrentAlarm(null);
          setResolution('');
        }}
        okText="消除"
        cancelText="取消"
        width={500}
      >
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">处理结果</label>
          <TextArea
            rows={4}
            placeholder="请填写处理结果..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </div>
        {currentAlarm && (
          <div className="bg-gray-700 p-4 rounded">
            <p><strong>告警标题：</strong>{currentAlarm.title}</p>
            <p><strong>告警等级：</strong>{alarmLevelLabels[currentAlarm.level]}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
