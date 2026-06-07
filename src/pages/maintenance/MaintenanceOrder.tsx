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
  Upload,
  Image,
  Timeline,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  UserSwitchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  CameraOutlined,
  InboxOutlined,
  HistoryOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import StatusBadge from '@/components/common/StatusBadge';
import { usePermission } from '@/hooks/usePermission';
import type { MaintenanceOrder, WorkOrderStatus } from '@/types/models';
import {
  formatDateTime,
  workOrderStatusLabels,
  workOrderStatusColors,
  workOrderLevelLabels,
  workOrderLevelColors,
  deviceTypeLabels,
  getCountdown,
} from '@/utils/format';
import { mockCabins, mockUsers } from '@/services/mock/mockData';
import { api } from '@/services/api';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const ESCALATE_THRESHOLD_HOURS = 48;

const maintenanceOrderStatusLabels: Record<string, string> = {
  pending: '待分配',
  processing: '处理中',
  reviewing: '待验收',
  completed: '已完成',
  overdue: '已超期',
  escalated: '已升级',
};

const maintenanceOrderStatusColors: Record<string, string> = {
  pending: '#f97316',
  processing: '#3b82f6',
  reviewing: '#8b5cf6',
  completed: '#10b981',
  overdue: '#ef4444',
  escalated: '#dc2626',
};

const deviceTypeOptions = [
  { value: 'fan', label: '排风机' },
  { value: 'pump', label: '水泵' },
  { value: 'light', label: '照明' },
  { value: 'door', label: '防火门' },
  { value: 'camera', label: '摄像机' },
  { value: 'sensor', label: '传感器' },
];

export default function MaintenanceOrderPage() {
  const { user, hasPermission } = usePermission();
  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<MaintenanceOrder | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [beforeImages, setBeforeImages] = useState<UploadFile[]>([]);
  const [afterImages, setAfterImages] = useState<UploadFile[]>([]);
  const [completedRemark, setCompletedRemark] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferUserName, setTransferUserName] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getMaintenanceOrders();
      setOrders(data);
    } catch (error) {
      message.error('获取维保工单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const values = form.getFieldsValue();
    return orders.filter((order) => {
      if (values.status && order.status !== values.status) return false;
      if (values.dateRange && values.dateRange.length === 2) {
        const createdAt = dayjs(order.createdAt);
        if (createdAt.isBefore(values.dateRange[0]) || createdAt.isAfter(values.dateRange[1])) return false;
      }
      return true;
    });
  }, [orders, form]);

  const checkShouldEscalate = (order: MaintenanceOrder): boolean => {
    if (order.escalated) return false;
    if (order.status === 'completed' || order.status === 'escalated') return false;
    const createdAt = dayjs(order.createdAt);
    const now = dayjs();
    const diffHours = now.diff(createdAt, 'hour');
    return diffHours >= ESCALATE_THRESHOLD_HOURS;
  };

  const getEscalateInfo = (order: MaintenanceOrder) => {
    if (order.escalated) {
      return {
        text: `已升级至${order.escalatedTo || '设备部长'}`,
        color: '#dc2626',
        escalated: true,
      };
    }
    if (checkShouldEscalate(order)) {
      return {
        text: '需立即升级',
        color: '#dc2626',
        escalated: false,
        shouldEscalate: true,
      };
    }
    const createdAt = dayjs(order.createdAt);
    const now = dayjs();
    const diffHours = now.diff(createdAt, 'hour');
    const remaining = ESCALATE_THRESHOLD_HOURS - diffHours;
    if (remaining <= 12) {
      return {
        text: `${remaining}小时后自动升级`,
        color: '#f97316',
        escalated: false,
        urgent: true,
      };
    }
    return {
      text: `${remaining}小时后自动升级`,
      color: '#64748b',
      escalated: false,
    };
  };

  const getDisplayStatus = (order: MaintenanceOrder): string => {
    if (order.escalated) return 'escalated';
    if (checkShouldEscalate(order)) return 'overdue';
    return order.status;
  };

  const openCompleteModal = async (order: MaintenanceOrder) => {
    setCurrentOrder(order);
    setCompletedRemark('');
    setAfterImages([]);
    
    if (order.images?.before) {
      setBeforeImages(
        order.images.before.map((url, index) => ({
          uid: `before-${index}`,
          name: `before-${index + 1}.jpg`,
          status: 'done' as const,
          url,
        }))
      );
    } else {
      setBeforeImages([]);
    }
    completeForm.resetFields();
    setCompleteModalVisible(true);
  };

  const openTransferModal = (order: MaintenanceOrder) => {
    setCurrentOrder(order);
    setTransferUserId('');
    setTransferUserName('');
    transferForm.resetFields();
    setTransferModalVisible(true);
  };

  const openDetailModal = (order: MaintenanceOrder) => {
    setCurrentOrder(order);
    if (order.images?.before) {
      setBeforeImages(
        order.images.before.map((url, index) => ({
          uid: `before-${index}`,
          name: `before-${index + 1}.jpg`,
          status: 'done' as const,
          url,
        }))
      );
    } else {
      setBeforeImages([]);
    }
    if (order.images?.after) {
      setAfterImages(
        order.images.after.map((url, index) => ({
          uid: `after-${index}`,
          name: `after-${index + 1}.jpg`,
          status: 'done' as const,
          url,
        }))
      );
    } else {
      setAfterImages([]);
    }
    setDetailModalVisible(true);
  };

  const handleAccept = async (order: MaintenanceOrder) => {
    if (!user) return;
    try {
      await api.updateMaintenanceOrderStatus(
        order.id,
        'processing',
        user.id,
        user.name,
        '已接单开始维保'
      );
      message.success('接单成功');
      fetchOrders();
    } catch (error) {
      message.error('接单失败');
    }
  };

  const handleTransfer = async () => {
    if (!currentOrder || !transferUserId || !user) return;
    try {
      await api.updateMaintenanceOrderStatus(
        currentOrder.id,
        currentOrder.status,
        user.id,
        user.name,
        `转派给${transferUserName}`
      );
      message.success('转派成功');
      setTransferModalVisible(false);
      setCurrentOrder(null);
      setTransferUserId('');
      setTransferUserName('');
      fetchOrders();
    } catch (error) {
      message.error('转派失败');
    }
  };

  const handleComplete = async () => {
    if (!currentOrder || !completedRemark.trim() || !user) {
      message.warning('请填写维保说明并上传修复后照片');
      return;
    }
    if (afterImages.length === 0) {
      message.warning('请上传修复后的照片');
      return;
    }
    try {
      const afterImageUrls = afterImages.map((img) => img.url || '');
      await api.updateMaintenanceOrderStatus(
        currentOrder.id,
        'reviewing',
        user.id,
        user.name,
        completedRemark.trim(),
        { after: afterImageUrls }
      );
      message.success('维保完成，已提交验收');
      setCompleteModalVisible(false);
      setCurrentOrder(null);
      setCompletedRemark('');
      setAfterImages([]);
      setBeforeImages([]);
      fetchOrders();
    } catch (error) {
      message.error('提交失败');
    }
  };

  const handleEscalate = async (order: MaintenanceOrder) => {
    if (!user) return;
    try {
      await api.escalateMaintenanceOrder(order.id, '设备部长');
      message.success('已升级至设备部长');
      fetchOrders();
    } catch (error) {
      message.error('升级失败');
    }
  };

  const uploadBeforeProps: UploadProps = {
    fileList: beforeImages,
    onChange: ({ fileList }) => setBeforeImages(fileList),
    beforeUpload: () => false,
  };

  const uploadAfterProps: UploadProps = {
    fileList: afterImages,
    onChange: ({ fileList }) => setAfterImages(fileList),
    beforeUpload: () => false,
  };

  const columns: ColumnsType<MaintenanceOrder> = [
    {
      title: '工单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
      render: (text: string, record) => (
        <a onClick={() => openDetailModal(record)} className="text-blue-400 hover:text-blue-300">
          {text}
        </a>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'deviceNames',
      key: 'deviceNames',
      width: 200,
      render: (names: string[]) => names.join('、'),
    },
    {
      title: '维保内容',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <span className="text-gray-300">{text}</span>
      ),
    },
    {
      title: '所在位置',
      dataIndex: 'cabinName',
      key: 'cabinName',
      width: 120,
    },
    {
      title: '指派班组',
      dataIndex: 'teamName',
      key: 'teamName',
      width: 120,
      render: (text: string, record) => (
        <Space>
          <UserSwitchOutlined className="text-purple-400" />
          <span>{text}</span>
          {record.assigneeName && <Tag color="purple">{record.assigneeName}</Tag>}
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <StatusBadge
          status={level}
          label={workOrderLevelLabels[level as keyof typeof workOrderLevelLabels]}
          color={workOrderLevelColors[level as keyof typeof workOrderLevelColors]}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => formatDateTime(text),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 180,
      render: (text: string, record) => {
        const countdown = getCountdown(text);
        return (
          <Space direction="vertical" size={4}>
            <span>{formatDateTime(text)}</span>
            <Tag
              color={countdown.overdue ? 'red' : countdown.urgent ? 'orange' : 'blue'}
              style={{ margin: 0 }}
            >
              {countdown.text}
            </Tag>
          </Space>
        );
      },
      sorter: (a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 200,
      render: (status: string, record) => {
        const displayStatus = getDisplayStatus(record);
        const escalateInfo = getEscalateInfo(record);
        return (
          <Space direction="vertical" size={4}>
            <StatusBadge
              status={displayStatus}
              label={maintenanceOrderStatusLabels[displayStatus]}
              color={maintenanceOrderStatusColors[displayStatus]}
              pulse={record.status === 'pending' && record.level === 'high'}
            />
            <Tag style={{ backgroundColor: 'transparent', margin: 0, border: `1px solid ${escalateInfo.color}40`, color: escalateInfo.color }}>
              <ArrowUpOutlined /> {escalateInfo.text}
            </Tag>
          </Space>
        );
      },
      filters: Object.entries(maintenanceOrderStatusLabels).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => getDisplayStatus(record) === value,
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const canExecute = hasPermission('maintenance:execute');
        const canTransfer = hasPermission('maintenance:transfer');
        const canComplete = hasPermission('maintenance:complete');
        const canEscalate = hasPermission('maintenance:escalate');
        
        return (
          <Space size="small" wrap>
            {record.status === 'pending' && canExecute && (
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAccept(record)}
              >
                接单
              </Button>
            )}
            {(record.status === 'pending' || record.status === 'processing') && canTransfer && (
              <Button
                type="default"
                size="small"
                icon={<UserSwitchOutlined />}
                onClick={() => openTransferModal(record)}
              >
                转派
              </Button>
            )}
            {record.status === 'processing' && canComplete && (
              <Button
                type="default"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => openCompleteModal(record)}
              >
                完工
              </Button>
            )}
            {checkShouldEscalate(record) && canEscalate && (
              <Button
                type="default"
                size="small"
                danger
                icon={<ArrowUpOutlined />}
                onClick={() => handleEscalate(record)}
              >
                升级
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => openDetailModal(record)}
            >
              详情
            </Button>
          </Space>
        );
      },
    },
  ];

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const todayExpire = orders.filter((o) => dayjs(o.deadline).isSame(dayjs(), 'day')).length;
    const overdue = orders.filter((o) => dayjs(o.deadline).isBefore(dayjs()) && o.status !== 'completed').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    return { pending, processing, todayExpire, overdue, completed };
  }, [orders]);

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">待处理</span>
              <ClockCircleOutlined className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-500 mt-2">{stats.pending}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">处理中</span>
              <ToolOutlined className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500 mt-2">{stats.processing}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">今日到期</span>
              <ClockCircleOutlined className="text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-500 mt-2">{stats.todayExpire}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已超期</span>
              <ExclamationCircleOutlined className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500 mt-2">{stats.overdue}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已完成</span>
              <CheckCircleOutlined className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500 mt-2">{stats.completed}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">升级阈值</span>
              <ArrowUpOutlined className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-500 mt-2">{ESCALATE_THRESHOLD_HOURS}H</div>
          </Card>
        </Col>
      </Row>

      <Card className="bg-gray-800 border-gray-700 mb-4">
        <Form form={form} layout="inline" onFinish={() => {}}>
          <Form.Item name="status" label="工单状态">
            <Select placeholder="全部状态" allowClear style={{ width: 140 }}>
              {Object.entries(maintenanceOrderStatusLabels).map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="deviceType" label="设备类型">
            <Select placeholder="全部类型" allowClear style={{ width: 140 }}>
              {deviceTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="cabinId" label="所在舱段">
            <Select placeholder="全部舱段" allowClear style={{ width: 160 }}>
              {mockCabins.map((cabin) => (
                <Option key={cabin.id} value={cabin.id}>
                  {cabin.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="创建时间">
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
              <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="维保完工"
        open={completeModalVisible}
        onOk={handleComplete}
        onCancel={() => {
          setCompleteModalVisible(false);
          setCurrentOrder(null);
          setCompletedRemark('');
          setAfterImages([]);
          setBeforeImages([]);
        }}
        okText="提交验收"
        cancelText="取消"
        width={800}
      >
        {currentOrder && (
          <div className="bg-gray-700 p-4 rounded mb-4">
            <p><strong>工单编号：</strong>{currentOrder.orderNo}</p>
            <p><strong>设备名称：</strong>{currentOrder.deviceNames.join('、')}</p>
            <p><strong>维保内容：</strong>{currentOrder.content}</p>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">
            <CameraOutlined /> 修复前照片
          </label>
          <div className="flex gap-2 flex-wrap">
            {beforeImages.map((file) => (
              <Image key={file.uid} width={100} height={100} src={file.url} />
            ))}
            {beforeImages.length === 0 && (
              <div className="text-gray-500 text-sm">暂无修复前照片</div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-400 mb-2">
            <CameraOutlined /> 修复后照片 <span className="text-red-500">*</span>
          </label>
          <Dragger
            {...uploadAfterProps}
            listType="picture"
            multiple
            accept="image/*"
            beforeUpload={() => {
              setAfterImages([
                ...afterImages,
                {
                  uid: `after-${Date.now()}`,
                  name: `after-${afterImages.length + 1}.jpg`,
                  status: 'done' as const,
                  url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=equipment%20maintenance%20after%20repair%20clean%20and%20working&image_size=square`,
                },
              ]);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传修复后照片</p>
            <p className="ant-upload-hint">支持多张图片上传，请确保照片清晰可见</p>
          </Dragger>
        </div>

        <div>
          <label className="block text-gray-400 mb-2">维保说明 <span className="text-red-500">*</span></label>
          <TextArea
            rows={4}
            placeholder="请详细描述维保过程、更换的零部件、测试结果等..."
            value={completedRemark}
            onChange={(e) => setCompletedRemark(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="工单转派"
        open={transferModalVisible}
        onOk={handleTransfer}
        onCancel={() => {
          setTransferModalVisible(false);
          setCurrentOrder(null);
          setTransferUserId('');
          setTransferUserName('');
        }}
        okText="确认转派"
        cancelText="取消"
      >
        {currentOrder && (
          <div className="bg-gray-700 p-4 rounded mb-4">
            <p><strong>工单编号：</strong>{currentOrder.orderNo}</p>
            <p><strong>当前处理人：</strong>{currentOrder.assigneeName}</p>
          </div>
        )}
        <div>
          <label className="block text-gray-400 mb-2">转派给 <span className="text-red-500">*</span></label>
          <Select
            placeholder="请选择转派人员"
            style={{ width: '100%' }}
            value={transferUserId || undefined}
            onChange={(value, option) => {
              setTransferUserId(value);
              const opt = Array.isArray(option) ? option[0] : option;
              setTransferUserName((opt?.label as string) || '');
            }}
          >
            {mockUsers
              .filter((u) => u.role === 'maintenance' || u.role === 'operator')
              .map((u) => (
                <Option key={u.id} value={u.id} label={u.name}>
                  {u.name} - {u.role === 'maintenance' ? '维修员' : '操作员'}
                </Option>
              ))}
          </Select>
        </div>
      </Modal>

      <Modal
        title="工单详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setCurrentOrder(null);
          setAfterImages([]);
          setBeforeImages([]);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {currentOrder && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" className="bg-gray-700 border-gray-600 mb-4">
                  <p><strong>工单编号：</strong>{currentOrder.orderNo}</p>
                  <p><strong>关联计划：</strong>{currentOrder.planName}</p>
                  <p><strong>所在位置：</strong>{currentOrder.cabinName}</p>
                  <p><strong>指派班组：</strong>{currentOrder.teamName}</p>
                  <p><strong>负责人：</strong>{currentOrder.assigneeName}</p>
                  <p><strong>优先级：</strong>
                    <Tag color={workOrderLevelColors[currentOrder.level]}>
                      {workOrderLevelLabels[currentOrder.level]}
                    </Tag>
                  </p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" className="bg-gray-700 border-gray-600 mb-4">
                  <p><strong>创建时间：</strong>{formatDateTime(currentOrder.createdAt)}</p>
                  <p><strong>截止时间：</strong>{formatDateTime(currentOrder.deadline)}</p>
                  {currentOrder.completedAt && (
                    <p><strong>完成时间：</strong>{formatDateTime(currentOrder.completedAt)}</p>
                  )}
                  <p><strong>状态：</strong>
                    <StatusBadge
                      status={currentOrder.status}
                      label={workOrderStatusLabels[currentOrder.status]}
                      color={workOrderStatusColors[currentOrder.status]}
                    />
                  </p>
                  {currentOrder.escalated && (
                    <p className="text-red-500">
                      <strong>升级状态：</strong>已升级至{currentOrder.escalatedTo}
                      {currentOrder.escalatedAt && ` (${formatDateTime(currentOrder.escalatedAt)})`}
                    </p>
                  )}
                </Card>
              </Col>
            </Row>

            <Card size="small" className="bg-gray-700 border-gray-600 mb-4" title="维保内容">
              <p className="text-gray-300">{currentOrder.content}</p>
              {currentOrder.completedRemark && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-gray-400 mb-1">完成说明：</p>
                  <p className="text-green-400">{currentOrder.completedRemark}</p>
                </div>
              )}
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" className="bg-gray-700 border-gray-600 mb-4" title="修复前照片">
                  {beforeImages.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {beforeImages.map((file) => (
                        <Image key={file.uid} width={120} height={120} src={file.url} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">暂无照片</div>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" className="bg-gray-700 border-gray-600 mb-4" title="修复后照片">
                  {afterImages.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {afterImages.map((file) => (
                        <Image key={file.uid} width={120} height={120} src={file.url} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">暂无照片</div>
                  )}
                </Card>
              </Col>
            </Row>

            <Card size="small" className="bg-gray-700 border-gray-600" title="操作记录">
              <Timeline
                items={currentOrder.logs.map((log) => ({
                  color: log.action.includes('升级') ? 'red' : log.action.includes('完成') ? 'green' : 'blue',
                  children: (
                    <div>
                      <p className="text-white">{log.action}</p>
                      <p className="text-gray-400 text-sm">
                        操作人：{log.operatorName} | {formatDateTime(log.timestamp)}
                      </p>
                      {log.remark && <p className="text-gray-300 text-sm">备注：{log.remark}</p>}
                    </div>
                  ),
                }))}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
