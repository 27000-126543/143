import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Select,
  Form,
  Modal,
  Input,
  message,
  Tag,
  Row,
  Col,
  Card,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import StatusBadge from '@/components/common/StatusBadge';
import { usePermission } from '@/hooks/usePermission';
import type { MaintenancePlan } from '@/types/models';
import { formatDate, deviceTypeLabels } from '@/utils/format';
import { mockCabins } from '@/services/mock/mockData';
import { api } from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;

const cycleOptions = [
  { value: 1, label: '每日', type: 'day' },
  { value: 7, label: '每周', type: 'week' },
  { value: 30, label: '每月', type: 'month' },
  { value: 90, label: '每季度', type: 'quarter' },
  { value: 365, label: '每年', type: 'year' },
];

const getCycleLabel = (days: number): string => {
  const opt = cycleOptions.find((o) => o.value === days);
  if (opt) return opt.label;
  if (days % 365 === 0) return `每${days / 365}年`;
  if (days % 30 === 0) return `每${days / 30}月`;
  if (days % 7 === 0) return `每${days / 7}周`;
  return `每${days}天`;
};

const deviceTypeOptions = [
  { value: 'fan', label: '排风机' },
  { value: 'pump', label: '水泵' },
  { value: 'light', label: '照明' },
  { value: 'door', label: '防火门' },
  { value: 'camera', label: '摄像机' },
  { value: 'sensor', label: '传感器' },
];

const teamOptions = [
  { value: 'team-1', label: '维修一班' },
  { value: 'team-2', label: '仪表班' },
  { value: 'team-3', label: '电气班' },
];

export default function MaintenancePlan() {
  const { user, hasPermission } = usePermission();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<MaintenancePlan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getMaintenancePlans();
      setPlans(data);
    } catch (error) {
      message.error('获取维保计划失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    const values = form.getFieldsValue();
    return plans.filter((plan) => {
      if (values.deviceType && plan.deviceType !== values.deviceType) return false;
      if (values.cabinId && !plan.cabinIds.includes(values.cabinId)) return false;
      if (values.cycleDays && plan.cycleDays !== values.cycleDays) return false;
      return true;
    });
  }, [plans, form]);

  const getCabinNames = (cabinIds: string[]): string => {
    return cabinIds
      .map((id) => {
        const cabin = mockCabins.find((c) => c.id === id);
        return cabin?.name || id;
      })
      .join('、');
  };

  const openAddModal = () => {
    setEditingPlan(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      status: 'active',
      cycleDays: 30,
    });
    setModalVisible(true);
  };

  const openEditModal = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    editForm.setFieldsValue({
      ...plan,
    });
    setModalVisible(true);
  };

  const openDeleteModal = (plan: MaintenancePlan) => {
    setDeletingPlan(plan);
    setDeleteModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingPlan) {
        message.success('维保计划更新成功');
      } else {
        message.success('维保计划创建成功');
      }
      setModalVisible(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      message.error('提交失败，请检查表单');
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    try {
      message.success('维保计划删除成功');
      setDeleteModalVisible(false);
      setDeletingPlan(null);
      fetchPlans();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleStatus = async (plan: MaintenancePlan, checked: boolean) => {
    try {
      message.success(`维保计划已${checked ? '启用' : '停用'}`);
      fetchPlans();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const columns: ColumnsType<MaintenancePlan> = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record) => (
        <Space>
          <SettingOutlined className="text-blue-400" />
          <span className="text-white font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{deviceTypeLabels[type as keyof typeof deviceTypeLabels] || type}</Tag>
      ),
      filters: deviceTypeOptions.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.deviceType === value,
    },
    {
      title: '所在舱段',
      dataIndex: 'cabinIds',
      key: 'cabinIds',
      width: 200,
      render: (ids: string[]) => getCabinNames(ids),
    },
    {
      title: '维保周期',
      dataIndex: 'cycleDays',
      key: 'cycleDays',
      width: 120,
      render: (days: number) => (
        <Space>
          <CalendarOutlined className="text-gray-400" />
          <span>{getCycleLabel(days)}</span>
        </Space>
      ),
      filters: cycleOptions.map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.cycleDays === value,
    },
    {
      title: '上次生成时间',
      dataIndex: 'lastGenerated',
      key: 'lastGenerated',
      width: 140,
      render: (text: string) => formatDate(text),
      sorter: (a, b) => dayjs(a.lastGenerated).unix() - dayjs(b.lastGenerated).unix(),
    },
    {
      title: '下次生成时间',
      dataIndex: 'nextGenerate',
      key: 'nextGenerate',
      width: 140,
      render: (text: string, record) => {
        const isOverdue = dayjs(text).isBefore(dayjs());
        return (
          <span style={{ color: isOverdue ? '#ef4444' : undefined }}>
            {formatDate(text)}
            {isOverdue && <Tag color="red" className="ml-2">待生成</Tag>}
          </span>
        );
      },
      sorter: (a, b) => dayjs(a.nextGenerate).unix() - dayjs(b.nextGenerate).unix(),
    },
    {
      title: '责任班组',
      dataIndex: 'assignedTeamName',
      key: 'assignedTeamName',
      width: 120,
      render: (text: string) => (
        <Space>
          <TeamOutlined className="text-purple-400" />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => (
        <Space>
          <StatusBadge
            status={status}
            label={status === 'active' ? '启用' : '停用'}
            color={status === 'active' ? '#10b981' : '#64748b'}
          />
          <Switch
            size="small"
            checked={status === 'active'}
            onChange={(checked) => handleToggleStatus(record, checked)}
            disabled={!hasPermission('maintenance:edit')}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const canEdit = hasPermission('maintenance:edit');
        const canDelete = hasPermission('maintenance:delete');
        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              >
                编辑
              </Button>
            )}
            {canDelete && (
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => openDeleteModal(record)}
              >
                删除
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.status === 'active').length;
    const inactive = plans.filter((p) => p.status === 'inactive').length;
    const pendingGenerate = plans.filter((p) => dayjs(p.nextGenerate).isBefore(dayjs())).length;
    const total = plans.length;
    return { total, active, inactive, pendingGenerate };
  }, [plans]);

  return (
    <div className="p-6">
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">计划总数</span>
              <SettingOutlined className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500 mt-2">{stats.total}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已启用</span>
              <Switch checked size="small" />
            </div>
            <div className="text-2xl font-bold text-green-500 mt-2">{stats.active}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已停用</span>
              <Switch size="small" />
            </div>
            <div className="text-2xl font-bold text-gray-500 mt-2">{stats.inactive}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">待生成工单</span>
              <CalendarOutlined className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500 mt-2">{stats.pendingGenerate}</div>
          </Card>
        </Col>
      </Row>

      <Card className="bg-gray-800 border-gray-700 mb-4">
        <Form form={form} layout="inline" onFinish={() => {}}>
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
          <Form.Item name="cycleDays" label="维保周期">
            <Select placeholder="全部周期" allowClear style={{ width: 140 }}>
              {cycleOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
                重置
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchPlans}>
                刷新
              </Button>
              {hasPermission('maintenance:add') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                  新增计划
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={filteredPlans}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingPlan ? '编辑维保计划' : '新增维保计划'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingPlan(null);
        }}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="计划名称"
                rules={[{ required: true, message: '请输入计划名称' }]}
              >
                <Input placeholder="请输入计划名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deviceType"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select placeholder="请选择设备类型">
                  {deviceTypeOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cabinIds"
                label="维保舱段"
                rules={[{ required: true, message: '请选择维保舱段' }]}
              >
                <Select mode="multiple" placeholder="请选择维保舱段">
                  {mockCabins.map((cabin) => (
                    <Option key={cabin.id} value={cabin.id}>
                      {cabin.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cycleDays"
                label="维保周期"
                rules={[{ required: true, message: '请选择维保周期' }]}
              >
                <Select placeholder="请选择维保周期">
                  {cycleOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedTeamId"
                label="责任班组"
                rules={[{ required: true, message: '请选择责任班组' }]}
              >
                <Select placeholder="请选择责任班组">
                  {teamOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="content"
            label="维保内容"
            rules={[{ required: true, message: '请输入维保内容' }]}
          >
            <TextArea rows={4} placeholder="请详细描述维保内容、步骤和要求..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="删除维保计划"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingPlan(null);
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除此维保计划吗？</p>
        {deletingPlan && (
          <div className="bg-gray-700 p-4 rounded mt-4">
            <p>
              <strong>计划名称：</strong>
              {deletingPlan.name}
            </p>
            <p>
              <strong>设备类型：</strong>
              {deviceTypeLabels[deletingPlan.deviceType as keyof typeof deviceTypeLabels] ||
                deletingPlan.deviceType}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
