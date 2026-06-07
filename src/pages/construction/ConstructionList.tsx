import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Tag,
  Select,
  Form,
  DatePicker,
  Modal,
  message,
  Descriptions,
  Alert,
  Row,
  Col,
  Statistic,
  QRCode,
  Tooltip,
  Input,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  QrcodeOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import type { ConstructionApply, Cabin, ConstructionStatus } from '@/types/models';
import {
  formatDateTime,
  riskLevelLabels,
  riskLevelColors,
  constructionStatusLabels,
  constructionStatusColors,
} from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface FilterFormData {
  status?: ConstructionStatus;
  cabinId?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  applicantUnit?: string;
}

export default function ConstructionList() {
  const [applies, setApplies] = useState<ConstructionApply[]>([]);
  const [filteredApplies, setFilteredApplies] = useState<ConstructionApply[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [viewingApply, setViewingApply] = useState<ConstructionApply | null>(null);
  const [filterForm] = Form.useForm<FilterFormData>();
  const { user, hasRole, isPipelineUser, getPipelineUnitFilter, canViewAllData } = usePermission();

  const pipelineUnitFilter = getPipelineUnitFilter();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [applyData, cabinData] = await Promise.all([
        api.getConstructionApplies(),
        api.getCabins(),
      ]);

      let filtered = applyData;
      if (pipelineUnitFilter) {
        filtered = applyData.filter((a) => a.pipelineUnitId === pipelineUnitFilter);
      }

      setApplies(filtered);
      setFilteredApplies(filtered);
      setCabins(cabinData);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pipelineUnitFilter]);

  const getCabinName = (cabinId: string) => {
    return cabins.find((c) => c.id === cabinId)?.name || cabinId;
  };

  const checkOverdue = (apply: ConstructionApply) => {
    if (apply.status !== 'inProgress' && apply.status !== 'approved') return false;
    return dayjs().isAfter(dayjs(apply.planEndTime));
  };

  const handleSearch = (values: FilterFormData) => {
    let filtered = [...applies];

    if (values.status) {
      filtered = filtered.filter((a) => a.status === values.status);
    }
    if (values.cabinId) {
      filtered = filtered.filter((a) => a.cabinId === values.cabinId);
    }
    if (values.applicantUnit) {
      filtered = filtered.filter((a) =>
        a.applicantUnit.includes(values.applicantUnit)
      );
    }
    if (values.dateRange && values.dateRange.length === 2) {
      filtered = filtered.filter((a) => {
        const applyDate = dayjs(a.createdAt);
        return (
          applyDate.isAfter(values.dateRange[0].startOf('day')) &&
          applyDate.isBefore(values.dateRange[1].endOf('day'))
        );
      });
    }

    setFilteredApplies(filtered);
  };

  const handleReset = () => {
    filterForm.resetFields();
    setFilteredApplies(applies);
  };

  const handleViewDetail = (apply: ConstructionApply) => {
    setViewingApply(apply);
    setDetailVisible(true);
  };

  const handleShowQRCode = (apply: ConstructionApply) => {
    setViewingApply(apply);
    setQrModalVisible(true);
  };

  const handleStartConstruction = async (apply: ConstructionApply) => {
    try {
      await api.startConstruction(apply.id);
      message.success('施工已开始');
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCompleteConstruction = async (apply: ConstructionApply) => {
    try {
      await api.completeConstruction(apply.id);
      message.success('施工已完成，区域锁定已解除');
      fetchData();
      setDetailVisible(false);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRemind = async (apply: ConstructionApply) => {
    message.info(`已向 ${apply.applicantName} 发送催办通知`);
  };

  const statistics = useMemo(() => {
    const now = dayjs();
    return {
      total: applies.length,
      pending: applies.filter((a) => a.status === 'pending').length,
      inProgress: applies.filter((a) => a.status === 'inProgress').length,
      completed: applies.filter((a) => a.status === 'completed').length,
      overdue: applies.filter((a) => {
        if (a.status !== 'inProgress' && a.status !== 'approved') return false;
        return now.isAfter(dayjs(a.planEndTime));
      }).length,
    };
  }, [applies]);

  const columns: ColumnsType<ConstructionApply> = [
    {
      title: '申请编号',
      dataIndex: 'applyNo',
      key: 'applyNo',
      width: 140,
      render: (text) => <span className="text-white font-mono">{text}</span>,
      fixed: 'left',
    },
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
      render: (text, record) => (
        <div>
          <div className="text-white font-medium">{text}</div>
          <div className="text-gray-500 text-xs mt-1">
            {record.applicantUnit}
          </div>
        </div>
      ),
    },
    {
      title: '施工类型',
      dataIndex: 'constructionType',
      key: 'constructionType',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '施工舱段',
      dataIndex: 'cabinId',
      key: 'cabinId',
      width: 140,
      render: (cabinId) => getCabinName(cabinId),
    },
    {
      title: '施工区域',
      dataIndex: 'constructionArea',
      key: 'constructionArea',
      width: 160,
      render: (text) => <span className="text-gray-300">{text}</span>,
    },
    {
      title: '风险等级',
      dataIndex: ['riskAssessment', 'level'],
      key: 'riskLevel',
      width: 100,
      render: (level, record) => (
        <StatusBadge
          status={level}
          label={riskLevelLabels[level]}
          color={riskLevelColors[level]}
          pulse={level === 'high'}
        />
      ),
    },
    {
      title: '计划时段',
      key: 'planTime',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="text-gray-300 text-sm">{formatDateTime(record.planStartTime)}</div>
          <div className="text-gray-500 text-xs">至 {formatDateTime(record.planEndTime)}</div>
        </div>
      ),
    },
    {
      title: '实际时段',
      key: 'actualTime',
      width: 200,
      render: (_, record) => {
        if (!record.actualStartTime) {
          return <span className="text-gray-500">未开始</span>;
        }
        return (
          <div>
            <div className="text-gray-300 text-sm">{formatDateTime(record.actualStartTime)}</div>
            {record.actualEndTime && (
              <div className="text-gray-500 text-xs">至 {formatDateTime(record.actualEndTime)}</div>
            )}
          </div>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const isOverdue = checkOverdue(record);
        const displayStatus = isOverdue ? 'overdue' : record.status;
        return (
          <Space direction="vertical" size={2}>
            <StatusBadge
              status={displayStatus}
              label={constructionStatusLabels[displayStatus]}
              color={constructionStatusColors[displayStatus]}
              pulse={isOverdue || (record.status === 'pending' && record.riskAssessment.level === 'high')}
            />
            {record.reminders > 0 && (
              <Tag color="orange" icon={<BellOutlined />}>
                已催办 {record.reminders} 次
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time) => (
        <div className="text-gray-300 text-sm">{formatDateTime(time)}</div>
      ),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_, record) => {
        const isOverdue = checkOverdue(record);
        const canManage = hasRole(['admin', 'supervisor']);
        const isOwner = user && user.pipelineUnitId === record.pipelineUnitId;

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
            {record.electronicPass && (
              <Tooltip title="查看电子通行证">
                <Button
                  type="link"
                  size="small"
                  icon={<QrcodeOutlined />}
                  onClick={() => handleShowQRCode(record)}
                >
                  通行证
                </Button>
              </Tooltip>
            )}
            {record.status === 'approved' && (isOwner || canManage) && (
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartConstruction(record)}
              >
                开始施工
              </Button>
            )}
            {record.status === 'inProgress' && (isOwner || canManage) && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteConstruction(record)}
              >
                确认完工
              </Button>
            )}
            {isOverdue && canManage && (
              <Tooltip title="发送催办通知">
                <Button
                  type="default"
                  size="small"
                  danger
                  icon={<BellOutlined />}
                  onClick={() => handleRemind(record)}
                >
                  催办
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const statusOptions = [
    { value: 'pending', label: '待审批' },
    { value: 'approved', label: '已批准' },
    { value: 'rejected', label: '已驳回' },
    { value: 'inProgress', label: '施工中' },
    { value: 'completed', label: '已完成' },
    { value: 'overdue', label: '已逾期' },
  ];

  return (
    <div className="p-6">
      {isPipelineUser() && (
        <Alert
          message="管线单位用户"
          description={`您当前只能查看 ${user?.pipelineUnitName} 申请的施工记录`}
          type="info"
          showIcon
          className="mb-6"
        />
      )}

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              施工记录列表
            </h2>
            <p className="text-gray-400 text-sm">
              查看和管理所有施工申请记录
            </p>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            刷新
          </Button>
        </div>
      </Card>

      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">总计</span>}
              value={statistics.total}
              prefix={<FileTextOutlined className="text-blue-400" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">待审批</span>}
              value={statistics.pending}
              prefix={<ClockCircleOutlined className="text-orange-400" />}
              valueStyle={{ color: '#f97316' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">施工中</span>}
              value={statistics.inProgress}
              prefix={<PlayCircleOutlined className="text-green-400" />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">已完成</span>}
              value={statistics.completed}
              prefix={<CheckCircleOutlined className="text-cyan-400" />}
              valueStyle={{ color: '#0ea5e9' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">已逾期</span>}
              value={statistics.overdue}
              prefix={<WarningOutlined className="text-red-500" />}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">完成率</span>}
              value={statistics.total > 0 ? Math.round((statistics.completed / statistics.total) * 100) : 0}
              suffix="%"
              prefix={<CheckCircleOutlined className="text-green-400" />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
      </Row>

      {statistics.overdue > 0 && (
        <Alert
          message="超时施工提醒"
          description={
            <div>
              有 {statistics.overdue} 个施工项目已超过计划完工时间：
              <Space className="mt-2" wrap>
                {applies
                  .filter((a) => checkOverdue(a))
                  .map((a) => (
                    <Tag key={a.id} color="red">
                      {a.projectName}
                    </Tag>
                  ))}
              </Space>
            </div>
          }
          type="error"
          showIcon
          icon={<WarningOutlined />}
          className="mb-6"
        />
      )}

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <Form
          form={filterForm}
          layout="inline"
          onFinish={handleSearch}
          className="flex flex-wrap gap-4"
        >
          <Form.Item name="status" label="状态">
            <Select
              placeholder="全部状态"
              allowClear
              className="w-36"
              options={statusOptions}
            />
          </Form.Item>
          <Form.Item name="cabinId" label="舱段">
            <Select
              placeholder="全部舱段"
              allowClear
              className="w-40"
              options={cabins.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="applicantUnit" label="单位">
            <Input
              placeholder="搜索单位"
              allowClear
              className="w-40"
              prefix={<EnvironmentOutlined className="text-gray-400" />}
            />
          </Form.Item>
          <Form.Item name="dateRange" label="日期">
            <RangePicker
              style={{ width: 280 }}
              className="bg-gray-700 border-gray-600"
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
              <Button onClick={handleReset} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={filteredApplies}
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
        title={<span className="text-white">施工详情</span>}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setViewingApply(null);
        }}
        footer={
          viewingApply?.status === 'inProgress' &&
          (user?.pipelineUnitId === viewingApply.pipelineUnitId || canViewAllData()) ? (
            <Space>
              <Button
                onClick={() => setDetailVisible(false)}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                取消
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteConstruction(viewingApply)}
                className="bg-green-500 hover:bg-green-600"
              >
                确认完工
              </Button>
            </Space>
          ) : null
        }
        width={900}
        className="dark-modal"
      >
        {viewingApply && (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <Space className="mb-2">
                  <StatusBadge
                    status={viewingApply.riskAssessment.level}
                    label={riskLevelLabels[viewingApply.riskAssessment.level]}
                    color={riskLevelColors[viewingApply.riskAssessment.level]}
                    pulse={viewingApply.riskAssessment.level === 'high'}
                  />
                  <Tag color="blue">{viewingApply.constructionType}</Tag>
                </Space>
                <h3 className="text-xl text-white font-semibold">
                  {viewingApply.projectName}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-gray-500 text-sm">申请编号</div>
                <div className="text-white font-mono">{viewingApply.applyNo}</div>
              </div>
            </div>

            <Descriptions
              bordered
              size="small"
              column={2}
              labelStyle={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: '#9ca3af',
                width: '120px',
              }}
              contentStyle={{ color: '#fff' }}
              className="mb-6"
            >
              <Descriptions.Item label="申请单位">
                <Space>
                  <EnvironmentOutlined className="text-blue-400" />
                  {viewingApply.applicantUnit}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="负责人">
                <Space>
                  <UserOutlined className="text-green-400" />
                  {viewingApply.applicantName}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                <Space>
                  <PhoneOutlined className="text-yellow-400" />
                  {viewingApply.applicantPhone}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="施工舱段">
                {getCabinName(viewingApply.cabinId)}
              </Descriptions.Item>
              <Descriptions.Item label="施工区域" span={2}>
                {viewingApply.constructionArea}
              </Descriptions.Item>
              <Descriptions.Item label="计划开始时间">
                {formatDateTime(viewingApply.planStartTime)}
              </Descriptions.Item>
              <Descriptions.Item label="计划结束时间">
                {formatDateTime(viewingApply.planEndTime)}
              </Descriptions.Item>
              <Descriptions.Item label="实际开始时间">
                {viewingApply.actualStartTime ? formatDateTime(viewingApply.actualStartTime) : '未开始'}
              </Descriptions.Item>
              <Descriptions.Item label="实际结束时间">
                {viewingApply.actualEndTime ? formatDateTime(viewingApply.actualEndTime) : '未完成'}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间" span={2}>
                {formatDateTime(viewingApply.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <WarningOutlined className="text-orange-400" />
                风险评估结果
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-gray-400 text-sm">风险等级：</span>
                  <Tag color={riskLevelColors[viewingApply.riskAssessment.level]}>
                    {riskLevelLabels[viewingApply.riskAssessment.level]}
                  </Tag>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">风险评分：</span>
                  <span
                    className="font-bold"
                    style={{ color: riskLevelColors[viewingApply.riskAssessment.level] }}
                  >
                    {viewingApply.riskAssessment.score} 分
                  </span>
                </div>
              </div>
              <div className="mb-3">
                <span className="text-gray-400 text-sm">建议施工时段：</span>
                <span className="text-white ml-2">
                  {viewingApply.riskAssessment.suggestedTimePeriod}
                </span>
              </div>
            </div>

            {viewingApply.electronicPass && (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                      <LockOutlined className="text-green-400" />
                      电子通行证
                    </div>
                    <Descriptions
                      size="small"
                      column={1}
                      labelStyle={{ color: '#9ca3af', width: '100px' }}
                      contentStyle={{ color: '#fff' }}
                    >
                      <Descriptions.Item label="通行证号">
                        <span className="font-mono">{viewingApply.electronicPass.passNo}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="有效期">
                        {formatDateTime(viewingApply.electronicPass.validFrom)} ~{' '}
                        {formatDateTime(viewingApply.electronicPass.validTo)}
                      </Descriptions.Item>
                      <Descriptions.Item label="锁定区域">
                        <Tag color="red" icon={<LockOutlined />}>
                          {viewingApply.electronicPass.lockedArea}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <QRCode
                      value={JSON.stringify({
                        passNo: viewingApply.electronicPass.passNo,
                        qrCode: viewingApply.electronicPass.qrCode,
                        area: viewingApply.electronicPass.lockedArea,
                        validFrom: viewingApply.electronicPass.validFrom,
                        validTo: viewingApply.electronicPass.validTo,
                      })}
                      size={120}
                    />
                    <div className="text-gray-600 text-xs text-center mt-2">扫码验证</div>
                  </div>
                </div>
              </div>
            )}

            {viewingApply.rejectReason && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mt-4">
                <div className="text-red-400 text-sm mb-2 flex items-center gap-2">
                  <WarningOutlined />
                  驳回原因
                </div>
                <p className="text-white">{viewingApply.rejectReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={<span className="text-white">电子通行证</span>}
        open={qrModalVisible}
        onCancel={() => {
          setQrModalVisible(false);
          setViewingApply(null);
        }}
        footer={null}
        width={400}
        className="dark-modal"
      >
        {viewingApply?.electronicPass && (
          <div className="text-center">
            <div className="bg-white inline-block p-6 rounded-lg mb-4">
              <QRCode
                value={JSON.stringify({
                  passNo: viewingApply.electronicPass.passNo,
                  qrCode: viewingApply.electronicPass.qrCode,
                  area: viewingApply.electronicPass.lockedArea,
                  validFrom: viewingApply.electronicPass.validFrom,
                  validTo: viewingApply.electronicPass.validTo,
                })}
                size={200}
                level="H"
              />
            </div>
            <div className="text-white font-mono text-lg mb-2">
              {viewingApply.electronicPass.passNo}
            </div>
            <div className="text-gray-400 text-sm mb-4">
              {viewingApply.projectName}
            </div>
            <Descriptions
              size="small"
              column={1}
              labelStyle={{ color: '#9ca3af', width: '100px' }}
              contentStyle={{ color: '#fff' }}
              className="text-left"
            >
              <Descriptions.Item label="施工单位">
                {viewingApply.applicantUnit}
              </Descriptions.Item>
              <Descriptions.Item label="施工区域">
                {viewingApply.electronicPass.lockedArea}
              </Descriptions.Item>
              <Descriptions.Item label="有效期">
                {formatDateTime(viewingApply.electronicPass.validFrom)}
                <br />
                至 {formatDateTime(viewingApply.electronicPass.validTo)}
              </Descriptions.Item>
              <Descriptions.Item label="允许人员">
                <Space wrap>
                  {viewingApply.electronicPass.allowedPersonnel.map((p, idx) => (
                    <Tag key={idx} color="green">{p}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
            <Alert
              message="使用说明"
              description="施工人员入廊前需出示此电子通行证，经安保人员扫码验证后方可进入"
              type="info"
              showIcon
              className="mt-4 text-left"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
