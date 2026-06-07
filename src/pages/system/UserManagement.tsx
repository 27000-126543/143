import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Key,
  Filter,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  Table,
  Input,
  Modal,
  message,
  Popconfirm,
  Tag,
  InputNumber,
  Avatar,
} from 'antd';
import { usePermission } from '@/hooks/usePermission';
import { api } from '@/services/api';
import { mockUsers, mockPipelineUnits } from '@/services/mock/mockData';
import type { User, RoleType, PipelineUnit } from '@/types/models';

const { Option } = Select;

interface UserFormData {
  username: string;
  name: string;
  role: RoleType;
  pipelineUnitId?: string;
  phone: string;
  status: 'active' | 'inactive';
}

const roleLabels: Record<RoleType, string> = {
  admin: '管理员',
  supervisor: '运行主管',
  operator: '值班人员',
  inspector: '巡检员',
  maintenance: '维修班组',
  pipelineUser: '管线单位用户',
};

const roleColors: Record<RoleType, string> = {
  admin: '#ef4444',
  supervisor: '#f97316',
  operator: '#3b82f6',
  inspector: '#10b981',
  maintenance: '#8b5cf6',
  pipelineUser: '#0ea5e9',
};

export default function UserManagement() {
  const { isAdmin } = usePermission();
  const [form] = Form.useForm<UserFormData>();
  const [filterForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pipelineUnits, setPipelineUnits] = useState<PipelineUnit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<RoleType | undefined>();
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | undefined>();
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, unitsData] = await Promise.all([
        api.getUsers(),
        api.getPipelineUnits(),
      ]);
      setUsers(usersData);
      setPipelineUnits(unitsData);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchSearch =
      !searchText ||
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.name.toLowerCase().includes(searchText.toLowerCase());
    const matchRole = !filterRole || user.role === filterRole;
    const matchStatus = !filterStatus || user.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
    });
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      role: user.role,
      pipelineUnitId: user.pipelineUnitId,
      phone: '13800138000',
      status: user.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (user: User) => {
    try {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      message.success(`已删除用户: ${user.name}`);
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  ...values,
                  pipelineUnitName: values.pipelineUnitId
                    ? pipelineUnits.find((p) => p.id === values.pipelineUnitId)?.name
                    : undefined,
                }
              : u
          )
        );
        message.success('用户信息已更新');
      } else {
        const newUser: User = {
          id: `user-${Date.now()}`,
          ...values,
          permissions: ['*'],
          pipelineUnitName: values.pipelineUnitId
            ? pipelineUnits.find((p) => p.id === values.pipelineUnitId)?.name
            : undefined,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${values.username}`,
        };
        setUsers([newUser, ...users]);
        message.success('用户创建成功');
      }
      setModalVisible(false);
    } catch {
      message.error('操作失败');
    }
  };

  const handleResetPassword = (user: User) => {
    setResettingUser(user);
    setResetPasswordVisible(true);
  };

  const confirmResetPassword = async () => {
    try {
      message.success(`已重置用户 ${resettingUser?.name} 的密码，新密码为: 123456`);
      setResetPasswordVisible(false);
    } catch {
      message.error('重置密码失败');
    }
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setSearchText('');
    setFilterRole(undefined);
    setFilterStatus(undefined);
  };

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: User) => (
        <div className="flex items-center gap-3">
          <Avatar size={40} src={record.avatar}>
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <div className="text-white font-medium">{record.name}</div>
            <div className="text-gray-400 text-xs">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: RoleType) => (
        <Tag
          style={{
            backgroundColor: roleColors[role] + '20',
            color: roleColors[role],
            borderColor: roleColors[role] + '40',
          }}
        >
          {roleLabels[role]}
        </Tag>
      ),
    },
    {
      title: '所属单位',
      dataIndex: 'pipelineUnitName',
      key: 'pipelineUnitName',
      render: (name: string) => name || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      render: () => '138****8000',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'active' | 'inactive') => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Edit2 size={12} />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Key size={12} />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定删除该用户?"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<Trash2 size={12} />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={48} className="text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">权限不足</h2>
          <p className="text-gray-400">仅管理员可管理用户</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 overflow-auto h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">用户管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理系统用户及权限配置</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={handleAdd}
        >
          新增用户
        </Button>
      </div>

      <Card className="data-card mb-6" size="small">
        <Form form={filterForm} layout="inline">
          <Form.Item label="搜索">
            <Input
              placeholder="搜索用户名/姓名"
              prefix={<Search size={14} className="text-gray-500" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </Form.Item>
          <Form.Item label="角色">
            <Select
              placeholder="选择角色"
              value={filterRole}
              onChange={setFilterRole}
              style={{ width: 150 }}
              allowClear
            >
              {(Object.keys(roleLabels) as RoleType[]).map((role) => (
                <Option key={role} value={role}>
                  {roleLabels[role]}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="状态">
            <Select
              placeholder="选择状态"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button icon={<Filter size={14} />} onClick={() => {}}>
                筛选
              </Button>
              <Button onClick={handleResetFilters}>重置</Button>
              <Button icon={<RefreshCw size={14} />} onClick={loadData} loading={loading}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="data-card" size="small">
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingUser ? '保存' : '创建'}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              {(Object.keys(roleLabels) as RoleType[]).map((role) => (
                <Option key={role} value={role}>
                  {roleLabels[role]}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.role !== curr.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'pipelineUser' ? (
                <Form.Item
                  name="pipelineUnitId"
                  label="所属管线单位"
                  rules={[{ required: true, message: '请选择管线单位' }]}
                >
                  <Select placeholder="请选择管线单位">
                    {pipelineUnits.map((unit) => (
                      <Option key={unit.id} value={unit.id}>
                        {unit.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={resetPasswordVisible}
        onCancel={() => setResetPasswordVisible(false)}
        onOk={confirmResetPassword}
        okText="确认重置"
        cancelText="取消"
      >
        <p className="text-gray-300">
          确定要重置用户 <span className="text-white font-semibold">{resettingUser?.name}</span> 的密码吗?
        </p>
        <p className="text-gray-400 text-sm mt-2">
          重置后密码为默认密码: <span className="text-warning-500 font-mono">123456</span>
        </p>
      </Modal>
    </motion.div>
  );
}
