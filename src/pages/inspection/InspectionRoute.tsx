import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  message,
  Card,
  Tag,
  Descriptions,
  Timeline,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FlagOutlined,
  PushpinOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '@/services/api';
import type { InspectionRoute, CheckPoint, Cabin, User } from '@/types/models';
import { formatDateTime } from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

interface RouteFormData {
  name: string;
  code: string;
  cabinIds: string[];
  cycleDays: number;
  assignedInspectorIds: string[];
  status: 'active' | 'inactive';
  checkPoints: CheckPoint[];
}

export default function InspectionRoute() {
  const [routes, setRoutes] = useState<InspectionRoute[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<InspectionRoute | null>(null);
  const [viewingRoute, setViewingRoute] = useState<InspectionRoute | null>(null);
  const [form] = Form.useForm<RouteFormData>();
  const { hasPermission } = usePermission();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routeData, cabinData, userData] = await Promise.all([
        api.getInspectionRoutes(),
        api.getCabins(),
        api.getUsers(),
      ]);
      setRoutes(routeData);
      setCabins(cabinData);
      setUsers(userData);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingRoute(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      cycleDays: 1,
      checkPoints: [],
    });
    setModalVisible(true);
  };

  const handleEdit = (record: InspectionRoute) => {
    setEditingRoute(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      cabinIds: record.cabinIds,
      cycleDays: record.cycleDays,
      assignedInspectorIds: record.assignedInspectorIds,
      status: record.status,
      checkPoints: record.checkPoints,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setRoutes(routes.filter((r) => r.id !== id));
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleView = (record: InspectionRoute) => {
    setViewingRoute(record);
    setDetailVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRoute) {
        setRoutes(
          routes.map((r) =>
            r.id === editingRoute.id ? { ...r, ...values } : r
          )
        );
        message.success('更新成功');
      } else {
        const newRoute: InspectionRoute = {
          id: `route-${Date.now()}`,
          ...values,
        };
        setRoutes([...routes, newRoute]);
        message.success('创建成功');
      }
      setModalVisible(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getCabinName = (cabinId: string) => {
    return cabins.find((c) => c.id === cabinId)?.name || cabinId;
  };

  const getInspectorNames = (ids: string[]) => {
    return ids
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const columns: ColumnsType<InspectionRoute> = [
    {
      title: '路线名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FlagOutlined className="text-blue-400" />
          <span className="text-white">{text}</span>
          <Tag color="geekblue">{record.code}</Tag>
        </Space>
      ),
    },
    {
      title: '舱段',
      dataIndex: 'cabinIds',
      key: 'cabinIds',
      render: (ids: string[]) => (
        <Space wrap>
          {ids.map((id) => (
            <Tag key={id} color="cyan">
              {getCabinName(id)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '巡检点数量',
      dataIndex: 'checkPoints',
      key: 'checkPoints',
      render: (points: CheckPoint[]) => (
        <span className="text-white">
          <PushpinOutlined className="text-green-400 mr-1" />
          {points.length} 个
        </span>
      ),
    },
    {
      title: '计划周期',
      dataIndex: 'cycleDays',
      key: 'cycleDays',
      render: (days) => (
        <span className="text-white">每 {days} 天</span>
      ),
    },
    {
      title: '责任人',
      dataIndex: 'assignedInspectorIds',
      key: 'assignedInspectorIds',
      render: (ids: string[]) => (
        <Space>
          <UserOutlined className="text-purple-400" />
          <span className="text-gray-300">{getInspectorNames(ids)}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <StatusBadge
          status={status}
          label={status === 'active' ? '启用' : '停用'}
          color={status === 'active' ? '#10b981' : '#64748b'}
        />
      ),
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
            onClick={() => handleView(record)}
          >
            详情
          </Button>
          {hasPermission('inspection:edit') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {hasPermission('inspection:delete') && (
            <Popconfirm
              title="确定删除该路线吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card className="bg-dark-800 border-dark-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              巡检路线管理
            </h2>
            <p className="text-gray-400 text-sm">
              管理巡检路线、巡检点配置及责任人分配
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
            {hasPermission('inspection:create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                className="bg-blue-500 hover:bg-blue-600"
              >
                新增路线
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Card className="bg-dark-800 border-dark-700">
        <Table
          columns={columns}
          dataSource={routes}
          rowKey="id"
          loading={loading}
          className="bg-dark-800"
          pagination={{
            pageSize: 10,
            className: '!bg-dark-800',
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={
          <span className="text-white">
            {editingRoute ? '编辑巡检路线' : '新增巡检路线'}
          </span>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={800}
        className="dark-modal"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label={<span className="text-gray-300">路线名称</span>}
              rules={[{ required: true, message: '请输入路线名称' }]}
            >
              <Input
                placeholder="请输入路线名称"
                className="bg-dark-700 border-dark-600 text-white placeholder-gray-500"
              />
            </Form.Item>
            <Form.Item
              name="code"
              label={<span className="text-gray-300">路线编码</span>}
              rules={[{ required: true, message: '请输入路线编码' }]}
            >
              <Input
                placeholder="请输入路线编码"
                className="bg-dark-700 border-dark-600 text-white placeholder-gray-500"
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="cabinIds"
              label={<span className="text-gray-300">涉及舱段</span>}
              rules={[{ required: true, message: '请选择涉及舱段' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择舱段"
                className="w-full"
                options={cabins.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="cycleDays"
              label={<span className="text-gray-300">巡检周期(天)</span>}
              rules={[{ required: true, message: '请输入巡检周期' }]}
            >
              <InputNumber
                min={1}
                max={365}
                placeholder="请输入周期天数"
                className="w-full bg-dark-700 border-dark-600"
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="assignedInspectorIds"
              label={<span className="text-gray-300">责任人</span>}
              rules={[{ required: true, message: '请选择责任人' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择责任人"
                className="w-full"
                options={users
                  .filter((u) => u.role === 'inspector' || u.role === 'admin')
                  .map((u) => ({
                    label: u.name,
                    value: u.id,
                  }))}
              />
            </Form.Item>
            <Form.Item
              name="status"
              label={<span className="text-gray-300">状态</span>}
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                placeholder="请选择状态"
                className="w-full"
                options={[
                  { label: '启用', value: 'active' },
                  { label: '停用', value: 'inactive' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-white">巡检路线详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
        className="dark-modal"
      >
        {viewingRoute && (
          <div>
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
            >
              <Descriptions.Item label="路线名称">
                {viewingRoute.name}
              </Descriptions.Item>
              <Descriptions.Item label="路线编码">
                {viewingRoute.code}
              </Descriptions.Item>
              <Descriptions.Item label="涉及舱段">
                {viewingRoute.cabinIds.map((id) => getCabinName(id)).join(', ')}
              </Descriptions.Item>
              <Descriptions.Item label="巡检周期">
                每 {viewingRoute.cycleDays} 天
              </Descriptions.Item>
              <Descriptions.Item label="责任人">
                {getInspectorNames(viewingRoute.assignedInspectorIds)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusBadge
                  status={viewingRoute.status}
                  label={viewingRoute.status === 'active' ? '启用' : '停用'}
                  color={viewingRoute.status === 'active' ? '#10b981' : '#64748b'}
                />
              </Descriptions.Item>
            </Descriptions>

            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
              <PushpinOutlined className="text-green-400" />
              巡检点分布 ({viewingRoute.checkPoints.length} 个)
            </h4>
            <Timeline
              items={viewingRoute.checkPoints
                .sort((a, b) => a.order - b.order)
                .map((point) => ({
                  color: '#3b82f6',
                  children: (
                    <div className="bg-dark-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-white font-medium">
                            {point.name}
                          </span>
                          <Tag color="geekblue" className="ml-2">
                            {point.code}
                          </Tag>
                        </div>
                        <Tag color="cyan">{getCabinName(point.cabinId)}</Tag>
                      </div>
                      <div className="text-gray-400 text-sm mb-2">
                        <PushpinOutlined className="mr-1" />
                        {point.location}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-gray-500 text-xs">检查项：</span>
                        {point.requiredItems.map((item, idx) => (
                          <Tag key={idx} color="purple">
                            {item}
                          </Tag>
                        ))}
                      </div>
                      <div className="text-gray-500 text-xs mt-2">
                        二维码：{point.qrCode}
                      </div>
                    </div>
                  ),
                }))}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
