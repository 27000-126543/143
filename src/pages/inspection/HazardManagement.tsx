import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Tag,
  Select,
  Form,
  Input,
  Modal,
  message,
  Upload,
  Image,
  Row,
  Col,
  Statistic,
  Descriptions,
  Alert,
  Tooltip,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  PushpinOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CameraOutlined,
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import type {
  Hazard,
  Cabin,
  User,
  WorkOrder,
  WorkOrderLevel,
} from '@/types/models';
import {
  formatDateTime,
  getCountdown,
  workOrderLevelLabels,
  workOrderLevelColors,
  workOrderStatusLabels,
  workOrderStatusColors,
} from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

const { Option } = Select;
const { TextArea } = Input;

interface FilterFormData {
  level?: WorkOrderLevel;
  status?: string;
  cabinId?: string;
  type?: string;
}

interface HazardFormData {
  cabinId: string;
  location: string;
  level: WorkOrderLevel;
  type: 'structure' | 'device' | 'environment' | 'other';
  title: string;
  description: string;
}

const hazardTypeLabels: Record<string, string> = {
  structure: '结构类',
  device: '设备类',
  environment: '环境类',
  other: '其他',
};

const hazardLevelLabels: Record<WorkOrderLevel, string> = {
  low: '一般',
  medium: '较大',
  high: '重大',
};

const hazardStatusLabels: Record<string, string> = {
  reported: '已上报',
  rectifying: '整改中',
  completed: '已完成',
  closed: '已关闭',
};

const hazardStatusColors: Record<string, string> = {
  reported: '#f97316',
  rectifying: '#3b82f6',
  completed: '#10b981',
  closed: '#64748b',
};

export default function HazardManagement() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [filteredHazards, setFilteredHazards] = useState<Hazard[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingHazard, setViewingHazard] = useState<Hazard | null>(null);
  const [reportForm] = Form.useForm<HazardFormData>();
  const [filterForm] = Form.useForm<FilterFormData>();
  const [photoList, setPhotoList] = useState<UploadFile[]>([]);
  const { hasPermission, user } = usePermission();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hazardData, cabinData, userData, orderData] = await Promise.all([
        api.getHazards(),
        api.getCabins(),
        api.getUsers(),
        api.getWorkOrders(),
      ]);
      setHazards(hazardData);
      setFilteredHazards(hazardData);
      setCabins(cabinData);
      setUsers(userData);
      setWorkOrders(orderData);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (values: FilterFormData) => {
    let filtered = [...hazards];

    if (values.level) {
      filtered = filtered.filter((h) => h.level === values.level);
    }
    if (values.status) {
      filtered = filtered.filter((h) => h.status === values.status);
    }
    if (values.cabinId) {
      filtered = filtered.filter((h) => h.cabinId === values.cabinId);
    }
    if (values.type) {
      filtered = filtered.filter((h) => h.type === values.type);
    }

    setFilteredHazards(filtered);
  };

  const handleReset = () => {
    filterForm.resetFields();
    setFilteredHazards(hazards);
  };

  const handleReport = () => {
    reportForm.resetFields();
    reportForm.setFieldsValue({ level: 'medium', type: 'structure' });
    setPhotoList([]);
    setReportModalVisible(true);
  };

  const handleReportSubmit = async () => {
    try {
      const values = await reportForm.validateFields();
      if (!user) {
        message.error('请先登录');
        return;
      }

      const imageUrls = photoList.map(
        (f) =>
          f.url ||
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hazard%20report%20image&image_size=square'
      );

      const newHazard = await api.reportHazard({
        ...values,
        reporterId: user.id,
        reporterName: user.name,
        images: imageUrls.length > 0 ? imageUrls : [
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underground%20utility%20tunnel%20hazard%20report&image_size=square',
        ],
      });

      setHazards([newHazard, ...hazards]);
      setFilteredHazards([newHazard, ...filteredHazards]);
      message.success('隐患上报成功');
      setReportModalVisible(false);
    } catch (error) {
      message.error('隐患上报失败');
    }
  };

  const handleViewDetail = (hazard: Hazard) => {
    setViewingHazard(hazard);
    setDetailVisible(true);
  };

  const handleCreateWorkOrder = async (hazard: Hazard) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    try {
      const deadline =
        hazard.level === 'high'
          ? dayjs().add(1, 'day')
          : hazard.level === 'medium'
          ? dayjs().add(3, 'day')
          : dayjs().add(7, 'day');

      const newOrder = await api.createWorkOrder({
        type: 'rectify',
        title: `${hazard.title} - 整改工单`,
        description: hazard.description,
        level: hazard.level,
        status: 'pending',
        cabinId: hazard.cabinId,
        cabinName: getCabinName(hazard.cabinId),
        area: hazard.location,
        assigneeId: user.id,
        assigneeName: user.name,
        deadline: deadline.format('YYYY-MM-DD HH:mm:ss'),
        images: { before: hazard.images },
        hazardId: hazard.id,
        createdBy: user.id,
        createdByName: user.name,
        constructionSuspended: hazard.level === 'high',
      });

      setWorkOrders([newOrder, ...workOrders]);
      setHazards(
        hazards.map((h) =>
          h.id === hazard.id
            ? { ...h, status: 'rectifying', rectifyOrderId: newOrder.id }
            : h
        )
      );
      setFilteredHazards(
        filteredHazards.map((h) =>
          h.id === hazard.id
            ? { ...h, status: 'rectifying', rectifyOrderId: newOrder.id }
            : h
        )
      );
      message.success('整改工单创建成功');
      setDetailVisible(false);
    } catch (error) {
      message.error('创建工单失败');
    }
  };

  const getCabinName = (cabinId: string) => {
    return cabins.find((c) => c.id === cabinId)?.name || cabinId;
  };

  const getWorkOrder = (orderId?: string) => {
    return workOrders.find((o) => o.id === orderId);
  };

  const statistics = {
    total: hazards.length,
    reported: hazards.filter((h) => h.status === 'reported').length,
    rectifying: hazards.filter((h) => h.status === 'rectifying').length,
    completed: hazards.filter((h) => h.status === 'completed').length,
    highLevel: hazards.filter((h) => h.level === 'high').length,
    overdue: workOrders.filter(
      (o) => o.type === 'rectify' && o.status === 'overdue'
    ).length,
  };

  const suspendedConstructions = workOrders.filter(
    (o) => o.constructionSuspended && o.status !== 'completed'
  );

  const columns: ColumnsType<Hazard> = [
    {
      title: '隐患编号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span className="text-white font-mono">{id}</span>,
      width: 140,
    },
    {
      title: '隐患等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: WorkOrderLevel) => (
        <StatusBadge
          status={level}
          label={hazardLevelLabels[level]}
          color={workOrderLevelColors[level]}
          pulse={level === 'high'}
        />
      ),
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color="purple">{hazardTypeLabels[type] || type}</Tag>
      ),
      width: 100,
    },
    {
      title: '隐患描述',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <div className="text-white font-medium">{text}</div>
          <div className="text-gray-500 text-xs mt-1 truncate max-w-xs">
            {record.description}
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: '位置',
      dataIndex: 'cabinId',
      key: 'cabinId',
      render: (cabinId, record) => (
        <Space>
          <PushpinOutlined className="text-green-400" />
          <div>
            <div className="text-white">{getCabinName(cabinId)}</div>
            <div className="text-gray-500 text-xs">{record.location}</div>
          </div>
        </Space>
      ),
      width: 180,
    },
    {
      title: '上报人',
      dataIndex: 'reporterName',
      key: 'reporterName',
      render: (text) => (
        <Space>
          <UserOutlined className="text-blue-400" />
          <span className="text-white">{text}</span>
        </Space>
      ),
      width: 100,
    },
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => (
        <div className="text-gray-300 text-sm">{formatDateTime(time)}</div>
      ),
      width: 160,
    },
    {
      title: '整改期限',
      key: 'deadline',
      render: (_, record) => {
        const order = getWorkOrder(record.rectifyOrderId);
        if (!order) {
          return <span className="text-gray-500">待分配</span>;
        }
        const countdown = getCountdown(order.deadline);
        return (
          <div>
            <div
              className={`text-sm ${
                countdown.overdue ? 'text-red-400' : countdown.urgent ? 'text-orange-400' : 'text-gray-300'
              }`}
            >
              {countdown.text}
            </div>
            <div className="text-gray-500 text-xs">
              {formatDateTime(order.deadline)}
            </div>
          </div>
        );
      },
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const order = getWorkOrder(record.rectifyOrderId);
        const displayStatus = order?.status || status;
        const displayLabel = order
          ? workOrderStatusLabels[order.status]
          : hazardStatusLabels[status];
        const displayColor = order
          ? workOrderStatusColors[order.status]
          : hazardStatusColors[status];

        return (
          <Space direction="vertical" size={2}>
            <StatusBadge
              status={displayStatus}
              label={displayLabel}
              color={displayColor}
              pulse={order?.status === 'overdue'}
            />
            {order?.constructionSuspended && order.status !== 'completed' && (
              <Tag color="red" icon={<StopOutlined />}>
                施工暂停
              </Tag>
            )}
          </Space>
        );
      },
      width: 140,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {hasPermission('hazard:rectify') &&
            record.status === 'reported' && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleCreateWorkOrder(record)}
              >
                创建工单
              </Button>
            )}
        </Space>
      ),
      width: 140,
    },
  ];

  return (
    <div className="p-6">
      {suspendedConstructions.length > 0 && (
        <Alert
          message="施工暂停通知"
          description={
            <div>
              有 {suspendedConstructions.length} 个区域因重大隐患未完成整改，施工已暂停：
              <Space className="mt-2" wrap>
                {suspendedConstructions.map((o) => (
                  <Tag key={o.id} color="red">
                    {o.cabinName} - {o.area}
                  </Tag>
                ))}
              </Space>
            </div>
          }
          type="error"
          showIcon
          icon={<StopOutlined />}
          className="mb-6"
        />
      )}

      <Card className="bg-dark-800 border-dark-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              隐患管理
            </h2>
            <p className="text-gray-400 text-sm">
              隐患上报、整改跟踪及施工安全管控
            </p>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              className="bg-dark-700 border-dark-600 text-white hover:bg-dark-600"
            >
              刷新
            </Button>
            {hasPermission('hazard:report') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleReport}
                className="bg-orange-500 hover:bg-orange-600"
              >
                上报隐患
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">隐患总数</span>}
              value={statistics.total}
              prefix={<WarningOutlined className="text-orange-400" />}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">待处理</span>}
              value={statistics.reported}
              prefix={<ClockCircleOutlined className="text-yellow-400" />}
              valueStyle={{ color: '#f97316' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">整改中</span>}
              value={statistics.rectifying}
              prefix={<FileTextOutlined className="text-blue-400" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">已完成</span>}
              value={statistics.completed}
              prefix={<CheckCircleOutlined className="text-green-400" />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">重大隐患</span>}
              value={statistics.highLevel}
              prefix={<ExclamationCircleOutlined className="text-red-400" />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">超期未整改</span>}
              value={statistics.overdue}
              prefix={<StopOutlined className="text-red-500" />}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="bg-dark-800 border-dark-700 mb-6">
        <Form
          form={filterForm}
          layout="inline"
          onFinish={handleSearch}
          className="flex flex-wrap gap-4"
        >
          <Form.Item name="level" label="隐患等级">
            <Select
              placeholder="选择等级"
              allowClear
              className="w-32"
              options={Object.entries(hazardLevelLabels).map(([value, label]) => ({
                label,
                value: value as WorkOrderLevel,
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              placeholder="选择状态"
              allowClear
              className="w-32"
              options={Object.entries(hazardStatusLabels).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item name="cabinId" label="舱段">
            <Select
              placeholder="选择舱段"
              allowClear
              className="w-40"
              options={cabins.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select
              placeholder="选择类型"
              allowClear
              className="w-32"
              options={Object.entries(hazardTypeLabels).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                className="bg-blue-500 hover:bg-blue-600"
              >
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="bg-dark-800 border-dark-700">
        <Table
          columns={columns}
          dataSource={filteredHazards}
          rowKey="id"
          loading={loading}
          className="bg-dark-800"
          pagination={{
            pageSize: 10,
            className: '!bg-dark-800',
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={<span className="text-white">上报隐患</span>}
        open={reportModalVisible}
        onOk={handleReportSubmit}
        onCancel={() => setReportModalVisible(false)}
        okText="提交上报"
        cancelText="取消"
        width={700}
        className="dark-modal"
      >
        <Form form={reportForm} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="cabinId"
              label={<span className="text-gray-300">所属舱段</span>}
              rules={[{ required: true, message: '请选择舱段' }]}
            >
              <Select
                placeholder="请选择舱段"
                className="w-full"
                options={cabins.map((c) => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>
            <Form.Item
              name="level"
              label={<span className="text-gray-300">隐患等级</span>}
              rules={[{ required: true, message: '请选择隐患等级' }]}
            >
              <Select
                placeholder="请选择隐患等级"
                className="w-full"
                options={Object.entries(hazardLevelLabels).map(
                  ([value, label]) => ({
                    label,
                    value: value as WorkOrderLevel,
                  })
                )}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="type"
              label={<span className="text-gray-300">隐患类型</span>}
              rules={[{ required: true, message: '请选择隐患类型' }]}
            >
              <Select
                placeholder="请选择隐患类型"
                className="w-full"
                options={Object.entries(hazardTypeLabels).map(([value, label]) => ({
                  label,
                  value: value as 'structure' | 'device' | 'environment' | 'other',
                }))}
              />
            </Form.Item>
            <Form.Item
              name="location"
              label={<span className="text-gray-300">具体位置</span>}
              rules={[{ required: true, message: '请输入具体位置' }]}
            >
              <Input
                placeholder="如：400米处北墙"
                className="bg-dark-700 border-dark-600 text-white placeholder-gray-500"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label={<span className="text-gray-300">隐患标题</span>}
            rules={[{ required: true, message: '请输入隐患标题' }]}
          >
            <Input
              placeholder="简要描述隐患"
              className="bg-dark-700 border-dark-600 text-white placeholder-gray-500"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-gray-300">详细描述</span>}
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述隐患情况，包括发现时间、具体现象、可能原因等"
              className="bg-dark-700 border-dark-600 text-white placeholder-gray-500"
            />
          </Form.Item>

          <Form.Item label={<span className="text-gray-300">现场照片</span>}>
            <Upload
              listType="picture-card"
              fileList={photoList}
              onChange={({ fileList }) => setPhotoList(fileList)}
              beforeUpload={() => false}
              maxCount={9}
            >
              <div>
                <CameraOutlined className="text-2xl text-gray-400" />
                <div className="mt-2 text-gray-400 text-sm">上传照片</div>
              </div>
            </Upload>
          </Form.Item>

          <Alert
            message="上报须知"
            description={
              <div className="text-xs">
                <p>• 重大隐患将自动暂停该区域施工作业</p>
                <p>• 请上传清晰的现场照片以便准确判断隐患情况</p>
                <p>• 上报后将根据隐患等级自动生成整改期限</p>
              </div>
            }
            type="info"
            showIcon
            className="mt-4"
          />
        </Form>
      </Modal>

      <Modal
        title={<span className="text-white">隐患详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
        className="dark-modal"
      >
        {viewingHazard && (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <Space className="mb-2">
                  <StatusBadge
                    status={viewingHazard.level}
                    label={hazardLevelLabels[viewingHazard.level]}
                    color={workOrderLevelColors[viewingHazard.level]}
                    pulse={viewingHazard.level === 'high'}
                  />
                  <Tag color="purple">
                    {hazardTypeLabels[viewingHazard.type]}
                  </Tag>
                  <StatusBadge
                    status={viewingHazard.status}
                    label={hazardStatusLabels[viewingHazard.status]}
                    color={hazardStatusColors[viewingHazard.status]}
                  />
                </Space>
                <h3 className="text-xl text-white font-semibold">
                  {viewingHazard.title}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-gray-500 text-sm">隐患编号</div>
                <div className="text-white font-mono">{viewingHazard.id}</div>
              </div>
            </div>

            {viewingHazard.level === 'high' && (
              <Alert
                message="重大隐患警告"
                description="该隐患为重大隐患，已自动暂停该区域施工作业，整改完成前禁止施工"
                type="error"
                showIcon
                icon={<StopOutlined />}
                className="mb-6"
              />
            )}

            <Descriptions
              bordered
              size="small"
              className="mb-6"
              labelStyle={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: '#9ca3af',
                width: '120px',
              }}
              contentStyle={{ color: '#fff' }}
              column={2}
            >
              <Descriptions.Item label="所属舱段">
                {getCabinName(viewingHazard.cabinId)}
              </Descriptions.Item>
              <Descriptions.Item label="具体位置">
                {viewingHazard.location}
              </Descriptions.Item>
              <Descriptions.Item label="上报人">
                {viewingHazard.reporterName}
              </Descriptions.Item>
              <Descriptions.Item label="上报时间">
                {formatDateTime(viewingHazard.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <div className="bg-dark-700 rounded-lg p-4 mb-6">
              <div className="text-gray-400 text-sm mb-2">隐患描述</div>
              <div className="text-white">{viewingHazard.description}</div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4 mb-6">
              <div className="text-gray-400 text-sm mb-3">现场照片</div>
              <div className="grid grid-cols-4 gap-3">
                {viewingHazard.images.map((img, idx) => (
                  <Image
                    key={idx}
                    width="100%"
                    height={120}
                    className="rounded object-cover"
                    src={img}
                  />
                ))}
              </div>
            </div>

            {viewingHazard.rectifyOrderId ? (
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-gray-400 text-sm flex items-center gap-2">
                    <FileTextOutlined />
                    关联整改工单
                  </div>
                  {(() => {
                    const order = getWorkOrder(viewingHazard.rectifyOrderId);
                    if (!order) return null;
                    const countdown = getCountdown(order.deadline);
                    const progressPercent =
                      order.status === 'completed'
                        ? 100
                        : order.status === 'processing'
                        ? 50
                        : order.status === 'reviewing'
                        ? 80
                        : 0;

                    return (
                      <Space>
                        {order.constructionSuspended &&
                          order.status !== 'completed' && (
                            <Tag color="red" icon={<StopOutlined />}>
                              施工已暂停
                            </Tag>
                          )}
                      </Space>
                    );
                  })()}
                </div>
                {(() => {
                  const order = getWorkOrder(viewingHazard.rectifyOrderId);
                  if (!order)
                    return (
                      <div className="text-gray-500">工单信息加载中...</div>
                    );

                  const countdown = getCountdown(order.deadline);
                  const progressPercent =
                    order.status === 'completed'
                      ? 100
                      : order.status === 'processing'
                      ? 50
                      : order.status === 'reviewing'
                      ? 80
                      : 0;

                  return (
                    <div>
                      <Descriptions
                        size="small"
                        column={2}
                        labelStyle={{ color: '#9ca3af' }}
                        contentStyle={{ color: '#fff' }}
                      >
                        <Descriptions.Item label="工单编号">
                          {order.orderNo}
                        </Descriptions.Item>
                        <Descriptions.Item label="工单状态">
                          <StatusBadge
                            status={order.status}
                            label={workOrderStatusLabels[order.status]}
                            color={workOrderStatusColors[order.status]}
                            pulse={order.status === 'overdue'}
                          />
                        </Descriptions.Item>
                        <Descriptions.Item label="责任人">
                          {order.assigneeName}
                        </Descriptions.Item>
                        <Descriptions.Item label="整改期限">
                          <span
                            className={
                              countdown.overdue
                                ? 'text-red-400'
                                : countdown.urgent
                                ? 'text-orange-400'
                                : 'text-white'
                            }
                          >
                            {countdown.text}
                          </span>
                        </Descriptions.Item>
                      </Descriptions>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">整改进度</span>
                          <span className="text-gray-400">{progressPercent}%</span>
                        </div>
                        <Progress
                          percent={progressPercent}
                          strokeColor={
                            order.status === 'overdue'
                              ? '#ef4444'
                              : order.status === 'completed'
                              ? '#10b981'
                              : '#3b82f6'
                          }
                          showInfo={false}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-dark-700 rounded-lg p-6 text-center">
                <FileTextOutlined className="text-4xl text-gray-600 mb-2" />
                <p className="text-gray-500 mb-4">暂无关联整改工单</p>
                {hasPermission('hazard:rectify') && (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleCreateWorkOrder(viewingHazard)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    创建整改工单
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
