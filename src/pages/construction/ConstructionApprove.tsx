import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Alert,
  Row,
  Col,
  Statistic,
  QRCode,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SafetyOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import type { ConstructionApply, Cabin } from '@/types/models';
import {
  formatDateTime,
  riskLevelLabels,
  riskLevelColors,
  getCountdown,
} from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

const { TextArea } = Input;

export default function ConstructionApprove() {
  const [applies, setApplies] = useState<ConstructionApply[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [viewingApply, setViewingApply] = useState<ConstructionApply | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectForm] = Form.useForm();
  const { user, hasPermission, hasRole } = usePermission();

  const canApprove = hasRole(['admin', 'supervisor']) || hasPermission('construction:approve');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [applyData, cabinData] = await Promise.all([
        api.getConstructionApplies(),
        api.getCabins(),
      ]);
      setApplies(applyData);
      setCabins(cabinData);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingApplies = useMemo(() => {
    return applies.filter((a) => a.status === 'pending');
  }, [applies]);

  const getCabinName = (cabinId: string) => {
    return cabins.find((c) => c.id === cabinId)?.name || cabinId;
  };

  const checkOverdue = (apply: ConstructionApply) => {
    if (apply.status !== 'inProgress' && apply.status !== 'approved') return null;
    const now = dayjs();
    const endTime = dayjs(apply.planEndTime);
    if (now.isAfter(endTime)) {
      return { overdue: true, text: '已超时' };
    }
    return null;
  };

  const handleViewDetail = (apply: ConstructionApply) => {
    setViewingApply(apply);
    setDetailVisible(true);
  };

  const handleApprove = async (apply: ConstructionApply) => {
    if (!user) {
      message.error('请先登录');
      return;
    }
    try {
      await api.approveConstructionApply(apply.id, user.id, user.name);
      message.success('审批通过，作业区域已锁定，电子通行证已生成');
      fetchData();
      setDetailVisible(false);
    } catch (error) {
      message.error('审批失败');
    }
  };

  const openRejectModal = (apply: ConstructionApply) => {
    setViewingApply(apply);
    setRejectReason('');
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!viewingApply || !user) return;
    try {
      const values = await rejectForm.validateFields();
      await api.rejectConstructionApply(
        viewingApply.id,
        user.id,
        user.name,
        values.rejectReason
      );
      message.success('申请已驳回');
      setRejectModalVisible(false);
      setViewingApply(null);
      fetchData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRemind = async (apply: ConstructionApply) => {
    message.info(`已向 ${apply.applicantName} 发送催办通知`);
  };

  const statistics = {
    pending: pendingApplies.length,
    highRisk: pendingApplies.filter((a) => a.riskAssessment.level === 'high').length,
    inProgress: applies.filter((a) => a.status === 'inProgress').length,
    overdue: applies.filter((a) => {
      if (a.status !== 'inProgress' && a.status !== 'approved') return false;
      return dayjs().isAfter(dayjs(a.planEndTime));
    }).length,
  };

  const columns: ColumnsType<ConstructionApply> = [
    {
      title: '申请编号',
      dataIndex: 'applyNo',
      key: 'applyNo',
      width: 140,
      render: (text) => <span className="text-white font-mono">{text}</span>,
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
            {record.applicantUnit} - {record.applicantName}
          </div>
        </div>
      ),
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
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const overdue = checkOverdue(record);
        return (
          <Space direction="vertical" size={2}>
            <StatusBadge
              status={record.status}
              label={{
                pending: '待审批',
                approved: '已批准',
                rejected: '已驳回',
                inProgress: '施工中',
                completed: '已完成',
                overdue: '已逾期',
              }[record.status] || record.status}
              color={{
                pending: '#f97316',
                approved: '#10b981',
                rejected: '#ef4444',
                inProgress: '#3b82f6',
                completed: '#0ea5e9',
                overdue: '#dc2626',
              }[record.status] || '#64748b'}
              pulse={record.status === 'pending' && record.riskAssessment.level === 'high'}
            />
            {overdue?.overdue && (
              <Tag color="red" icon={<WarningOutlined />}>
                {overdue.text}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isOverdue = checkOverdue(record)?.overdue;
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
            {record.status === 'pending' && canApprove && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record)}
                >
                  通过
                </Button>
                <Button
                  type="default"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openRejectModal(record)}
                >
                  驳回
                </Button>
              </>
            )}
            {isOverdue && canApprove && (
              <Tooltip title="发送催办通知">
                <Button
                  type="default"
                  size="small"
                  icon={<ClockCircleOutlined />}
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

  return (
    <div className="p-6">
      {!canApprove && (
        <Alert
          message="权限不足"
          description="您没有施工审批权限，只有管理员和运行主管可以进行审批操作"
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      <Card className="bg-gray-800 border-gray-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              施工审批
            </h2>
            <p className="text-gray-400 text-sm">
              审核施工申请，管理入廊作业权限
            </p>
          </div>
          <Button
            icon={<FileTextOutlined />}
            onClick={fetchData}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            刷新
          </Button>
        </div>
      </Card>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">待审批</span>}
              value={statistics.pending}
              prefix={<ClockCircleOutlined className="text-orange-400" />}
              valueStyle={{ color: '#f97316' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">高风险待审</span>}
              value={statistics.highRisk}
              prefix={<WarningOutlined className="text-red-500" />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">施工中</span>}
              value={statistics.inProgress}
              prefix={<SafetyOutlined className="text-blue-500" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-gray-800 border-gray-700">
            <Statistic
              title={<span className="text-gray-400">已超时</span>}
              value={statistics.overdue}
              prefix={<WarningOutlined className="text-red-600" />}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
      </Row>

      {statistics.overdue > 0 && (
        <Alert
          message="超时施工提醒"
          description={
            <div>
              有 {statistics.overdue} 个施工项目已超过计划完工时间，请及时催办：
              <Space className="mt-2" wrap>
                {applies
                  .filter((a) => {
                    if (a.status !== 'inProgress' && a.status !== 'approved') return false;
                    return dayjs().isAfter(dayjs(a.planEndTime));
                  })
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

      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={pendingApplies}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条待审批记录`,
          }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <CheckCircleOutlined className="text-4xl text-green-500 mb-4" />
                <p className="text-gray-400">暂无待审批的施工申请</p>
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title={<span className="text-white">施工申请详情</span>}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setViewingApply(null);
        }}
        footer={
          viewingApply?.status === 'pending' && canApprove ? (
            <Space>
              <Button
                onClick={() => setDetailVisible(false)}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                取消
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setDetailVisible(false);
                  if (viewingApply) openRejectModal(viewingApply);
                }}
              >
                驳回申请
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => viewingApply && handleApprove(viewingApply)}
                className="bg-green-500 hover:bg-green-600"
              >
                审核通过
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

            {viewingApply.riskAssessment.level === 'high' && (
              <Alert
                message="高风险施工"
                description="该施工风险等级较高，审批需谨慎，需确认安全措施到位后方可通过"
                type="error"
                showIcon
                icon={<WarningOutlined />}
                className="mb-6"
              />
            )}

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
              <Descriptions.Item label="申请时间" span={2}>
                {formatDateTime(viewingApply.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                <SafetyOutlined className="text-orange-400" />
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
                <span className="text-gray-400 text-sm">影响管线：</span>
                <Space wrap className="ml-2">
                  {viewingApply.riskAssessment.affectedPipelines.map((p, idx) => (
                    <Tag key={idx} color="blue">{p}</Tag>
                  ))}
                </Space>
              </div>
              <div className="mb-3">
                <span className="text-gray-400 text-sm">风险点：</span>
                <ul className="text-gray-300 text-sm mt-1 space-y-1">
                  {viewingApply.riskAssessment.riskPoints.map((rp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {rp}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-gray-400 text-sm">建议施工时段：</span>
                <span className="text-white ml-2">
                  {viewingApply.riskAssessment.suggestedTimePeriod}
                </span>
              </div>
            </div>

            {viewingApply.rejectReason && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-4">
                <div className="text-red-400 text-sm mb-2 flex items-center gap-2">
                  <CloseCircleOutlined />
                  驳回原因
                </div>
                <p className="text-white">{viewingApply.rejectReason}</p>
              </div>
            )}

            {viewingApply.status === 'approved' || viewingApply.status === 'inProgress' ? (
              viewingApply.electronicPass && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                        <LockOutlined className="text-green-400" />
                        电子通行证（审核通过后自动生成）
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
                        <Descriptions.Item label="允许人员">
                          <Space wrap>
                            {viewingApply.electronicPass.allowedPersonnel.map((p, idx) => (
                              <Tag key={idx} color="green">{p}</Tag>
                            ))}
                          </Space>
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
              )
            ) : viewingApply.status === 'pending' && canApprove ? (
              <Alert
                message="审批须知"
                description={
                  <div className="text-xs">
                    <p>• 审核通过后将自动锁定作业区域并生成电子通行证</p>
                    <p>• 高风险施工需确认已制定专项安全方案</p>
                    <p>• 超时未完工系统将自动触发催办通知</p>
                  </div>
                }
                type="info"
                showIcon
              />
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        title={<span className="text-white">驳回申请</span>}
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setViewingApply(null);
        }}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="rejectReason"
            label={<span className="text-gray-300">驳回原因</span>}
            rules={[{ required: true, message: '请填写驳回原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请填写驳回原因..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Form.Item>
          {viewingApply && (
            <div className="bg-gray-700 p-4 rounded mt-4">
              <p className="text-gray-400 text-sm">申请编号：{viewingApply.applyNo}</p>
              <p className="text-white">{viewingApply.projectName}</p>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
