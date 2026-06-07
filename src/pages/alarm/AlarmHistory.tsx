import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Form,
  Modal,
  Tag,
  Card,
  Row,
  Col,
  Descriptions,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
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
import { exportAlarms } from '@/utils/export';
import { mockCabins, mockSensors, mockUsers } from '@/services/mock/mockData';

const { RangePicker } = DatePicker;
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

export default function AlarmHistory() {
  const { alarms, loading, fetchAlarms } = useAlarmStore();
  const { hasPermission } = usePermission();
  const [form] = Form.useForm();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState<Alarm | null>(null);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const historyAlarms = useMemo(() => {
    return alarms.filter((a) => a.status === 'resolved' || a.status === 'closed');
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    const values = form.getFieldsValue();
    return alarms.filter((alarm) => {
      if (values.level && alarm.level !== values.level) return false;
      if (values.alarmType && alarm.alarmType !== values.alarmType) return false;
      if (values.cabinId && alarm.cabinId !== values.cabinId) return false;
      if (values.status && alarm.status !== values.status) return false;
      if (values.timeRange && values.timeRange.length === 2) {
        const alarmTime = dayjs(alarm.createdAt);
        if (alarmTime.isBefore(values.timeRange[0]) || alarmTime.isAfter(values.timeRange[1])) return false;
      }
      return true;
    });
  }, [alarms, form]);

  const getSensorName = (sensorId?: string) => {
    if (!sensorId) return '-';
    const sensor = mockSensors.find((s) => s.id === sensorId);
    if (sensor) {
      const typeLabel = sensorTypeLabels[sensor.type] || sensor.type;
      return `${typeLabel}传感器`;
    }
    return sensorId;
  };

  const getCabinName = (cabinId: string) => {
    const cabin = mockCabins.find((c) => c.id === cabinId);
    return cabin?.name || cabinId;
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    const user = mockUsers.find((u) => u.id === userId);
    return user?.name || userId;
  };

  const handleExport = () => {
    if (filteredAlarms.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }
    try {
      exportAlarms(filteredAlarms);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const openDetailModal = (alarm: Alarm) => {
    setCurrentAlarm(alarm);
    setDetailModalVisible(true);
  };

  const handleHandleDuration = (alarm: Alarm) => {
    if (!alarm.createdAt || !alarm.resolvedAt) return '-';
    const start = dayjs(alarm.createdAt);
    const end = dayjs(alarm.resolvedAt);
    const diffMinutes = end.diff(start, 'minute');
    if (diffMinutes < 60) return `${diffMinutes}分钟`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}小时${diffMinutes % 60}分钟`;
    const days = Math.floor(hours / 24);
    return `${days}天${hours % 24}小时`;
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
      render: (level: AlarmLevel) => (
        <StatusBadge
          status={level}
          label={alarmLevelLabels[level]}
          color={alarmLevelColors[level]}
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
      filters: [
        { text: '环境告警', value: 'environment' },
        { text: '设备告警', value: 'device' },
        { text: '施工告警', value: 'construction' },
        { text: '隐患告警', value: 'hazard' },
      ],
      onFilter: (value, record) => record.alarmType === value,
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
      width: 180,
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
        return `${formatNumber(value)}${sensor?.unit || ''}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: AlarmStatus, record) => (
        <Space direction="vertical" size={4}>
          <StatusBadge
            status={status}
            label={alarmStatusLabels[status]}
            color={alarmStatusColors[status]}
          />
          {record.escalated && <Tag color="orange">已升级</Tag>}
        </Space>
      ),
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '已确认', value: 'acknowledged' },
        { text: '处理中', value: 'processing' },
        { text: '已消除', value: 'resolved' },
        { text: '已关闭', value: 'closed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '确认人',
      dataIndex: 'acknowledgedByName',
      key: 'acknowledgedByName',
      width: 120,
      render: (name?: string) => name || '-',
    },
    {
      title: '处理时间',
      key: 'handleDuration',
      width: 150,
      render: (_, record) => handleHandleDuration(record),
    },
    {
      title: '处理结果',
      dataIndex: 'resolution',
      key: 'resolution',
      width: 200,
      ellipsis: true,
      render: (text?: string) => text || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openDetailModal(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const stats = useMemo(() => {
    const today = dayjs().startOf('day');
    const weekAgo = dayjs().subtract(7, 'day');
    const total = alarms.length;
    const todayCount = alarms.filter((a) => dayjs(a.createdAt).isAfter(today)).length;
    const weekCount = alarms.filter((a) => dayjs(a.createdAt).isAfter(weekAgo)).length;
    const resolved = historyAlarms.length;
    const escalated = alarms.filter((a) => a.escalated).length;
    return { total, todayCount, weekCount, resolved, escalated };
  }, [alarms, historyAlarms]);

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
            <span className="text-gray-400">告警总数</span>
            <HistoryOutlined className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500 mt-2">{stats.total}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
            <span className="text-gray-400">今日告警</span>
            <WarningOutlined className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500 mt-2">{stats.todayCount}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
            <span className="text-gray-400">本周告警</span>
            <WarningOutlined className="text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-500 mt-2">{stats.weekCount}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
            <span className="text-gray-400">已消除</span>
            <CheckCircleOutlined className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500 mt-2">{stats.resolved}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
            <span className="text-gray-400">已升级</span>
            <ArrowUpOutlined className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500 mt-2">{stats.escalated}</div>
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
          <Form.Item name="alarmType" label="告警类型">
            <Select placeholder="全部类型" allowClear style={{ width: 140 }}>
              <Option value="environment">环境告警</Option>
              <Option value="device">设备告警</Option>
              <Option value="construction">施工告警</Option>
              <Option value="hazard">隐患告警</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cabinId" label="所属舱室">
            <Select placeholder="全部舱室" allowClear style={{ width: 160 }}>
              {mockCabins.map((cabin) => (
                <Option key={cabin.id} value={cabin.id}>{cabin.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部状态" allowClear style={{ width: 140 }}>
              <Option value="pending">待处理</Option>
              <Option value="acknowledged">已确认</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已消除</Option>
              <Option value="closed">已关闭</Option>
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
              {hasPermission('alarm:export') && (
                <Button icon={<ExportOutlined />} onClick={handleExport}>
                  导出Excel
                </Button>
              )}
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
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="告警详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setCurrentAlarm(null);
        }}
        footer={null}
        width={700}
      >
        {currentAlarm && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="告警ID">{currentAlarm.id}</Descriptions.Item>
            <Descriptions.Item label="告警标题">{currentAlarm.title}</Descriptions.Item>
            <Descriptions.Item label="告警描述">{currentAlarm.description}</Descriptions.Item>
            <Descriptions.Item label="告警等级">
              <StatusBadge
                status={currentAlarm.level}
                label={alarmLevelLabels[currentAlarm.level]}
                color={alarmLevelColors[currentAlarm.level]}
              />
            </Descriptions.Item>
            <Descriptions.Item label="告警类型">{alarmTypeLabels[currentAlarm.alarmType]}</Descriptions.Item>
            <Descriptions.Item label="所属舱室">{getCabinName(currentAlarm.cabinId)}</Descriptions.Item>
            <Descriptions.Item label="传感器">{getSensorName(currentAlarm.sensorId)}</Descriptions.Item>
            <Descriptions.Item label="当前值">
              {currentAlarm.sensorValue !== undefined
                ? `${formatNumber(currentAlarm.sensorValue)}${mockSensors.find((s) => s.id === currentAlarm.sensorId)?.unit || ''}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="阈值">
              {currentAlarm.threshold !== undefined
                ? `${currentAlarm.threshold}${mockSensors.find((s) => s.id === currentAlarm.sensorId)?.unit || ''}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <StatusBadge
                status={currentAlarm.status}
                label={alarmStatusLabels[currentAlarm.status]}
                color={alarmStatusColors[currentAlarm.status]}
              />
            </Descriptions.Item>
            <Descriptions.Item label="是否升级">
              {currentAlarm.escalated ? (
                <Tag color="orange">
                  是 - {currentAlarm.escalatedToName || '-'} ({currentAlarm.escalatedAt ? formatDateTime(currentAlarm.escalatedAt) : '-'})
                </Tag>
              ) : (
                '否'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(currentAlarm.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="确认人">{getUserName(currentAlarm.acknowledgedBy)}</Descriptions.Item>
            <Descriptions.Item label="确认时间">
              {currentAlarm.acknowledgedAt ? formatDateTime(currentAlarm.acknowledgedAt) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="处理人">{getUserName(currentAlarm.resolvedBy)}</Descriptions.Item>
            <Descriptions.Item label="处理时间">
              {currentAlarm.resolvedAt ? formatDateTime(currentAlarm.resolvedAt) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="处理结果" span={2}>
              {currentAlarm.resolution || '-'}
            </Descriptions.Item>
            {currentAlarm.linkedDeviceAction && (
              <Descriptions.Item label="联动设备" span={2}>
                <div className="bg-gray-100 p-3 rounded">
                  <p><strong>设备名称：</strong>{currentAlarm.linkedDeviceAction.deviceName}</p>
                  <p><strong>操作：</strong>{currentAlarm.linkedDeviceAction.action === 'start' ? '启动' : '停止'}</p>
                  <p><strong>执行人：</strong>{currentAlarm.linkedDeviceAction.executedBy === 'system' ? '系统' : getUserName(currentAlarm.linkedDeviceAction.executedBy)}</p>
                  <p><strong>执行时间：</strong>{formatDateTime(currentAlarm.linkedDeviceAction.executedAt)}</p>
                  <p><strong>原因：</strong>{currentAlarm.linkedDeviceAction.reason}</p>
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
