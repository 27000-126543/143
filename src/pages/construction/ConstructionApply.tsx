import { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Alert,
  Descriptions,
  Tag,
  Space,
  message,
  Progress,
} from 'antd';
import {
  UploadOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import { mockCabins, mockPipelineUnits } from '@/services/mock/mockData';
import type {
  Cabin,
  RiskAssessment,
  RiskLevel,
  PipelineUnit,
} from '@/types/models';
import {
  riskLevelLabels,
  riskLevelColors,
  formatDateTime,
} from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface ApplyFormData {
  applicantUnit: string;
  projectName: string;
  applicantName: string;
  applicantPhone: string;
  cabinId: string;
  constructionArea: string;
  constructionType: string;
  planTime: [dayjs.Dayjs, dayjs.Dayjs];
  constructionScheme: string;
  safetyCommitment: string;
}

const pipelineTypeMap: Record<string, string[]> = {
  electric: ['电力线路改造', '电力设备检修', '电缆敷设'],
  communication: ['光纤熔接', '通信设备安装', '线路维护'],
  gas: ['阀门更换', '管道检测', '设备检修'],
  waterSupply: ['水管维修', '设备更换', '检漏作业'],
  drainage: ['管道清淤', '设备检修', '应急抢修'],
};

export default function ConstructionApply() {
  const [form] = Form.useForm<ApplyFormData>();
  const { user, isPipelineUser, getPipelineUnitFilter } = usePermission();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [pipelineUnits, setPipelineUnits] = useState<PipelineUnit[]>([]);
  const [schemeFileList, setSchemeFileList] = useState<UploadFile[]>([]);
  const [commitmentFileList, setCommitmentFileList] = useState<UploadFile[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pipelineUnitFilter = getPipelineUnitFilter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cabinData, unitData] = await Promise.all([
          api.getCabins(),
          api.getPipelineUnits(),
        ]);
        setCabins(cabinData);
        setPipelineUnits(unitData);

        if (user && isPipelineUser()) {
          const unit = unitData.find((u) => u.id === user.pipelineUnitId);
          form.setFieldsValue({
            applicantUnit: unit?.name || user.pipelineUnitName,
            applicantName: user.name,
          });
        }
      } catch (error) {
        message.error('获取数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [form, user, isPipelineUser]);

  const selectedCabin = useMemo(() => {
    const cabinId = form.getFieldValue('cabinId');
    return cabins.find((c) => c.id === cabinId);
  }, [cabins, form]);

  const availableConstructionTypes = useMemo(() => {
    if (!selectedCabin) return [];
    const types: string[] = [];
    selectedCabin.pipelineTypes.forEach((pt) => {
      if (pipelineTypeMap[pt]) {
        types.push(...pipelineTypeMap[pt]);
      }
    });

    if (isPipelineUser() && user?.pipelineUnitId) {
      const unit = pipelineUnits.find((u) => u.id === user.pipelineUnitId);
      if (unit && pipelineTypeMap[unit.type]) {
        return pipelineTypeMap[unit.type];
      }
    }
    return [...new Set(types)];
  }, [selectedCabin, isPipelineUser, user, pipelineUnits]);

  const filteredCabins = useMemo(() => {
    if (isPipelineUser() && user?.pipelineUnitId) {
      const unit = pipelineUnits.find((u) => u.id === user.pipelineUnitId);
      if (unit) {
        return cabins.filter((c) => c.pipelineTypes.includes(unit.type));
      }
    }
    return cabins;
  }, [cabins, isPipelineUser, user, pipelineUnits]);

  const evaluateRisk = () => {
    const values = form.getFieldsValue();
    if (!values.cabinId || !values.constructionType || !values.planTime) {
      return;
    }

    const cabin = cabins.find((c) => c.id === values.cabinId);
    if (!cabin) return;

    let score = 0;
    const affectedPipelines: string[] = [];
    const riskPoints: string[] = [];

    if (cabin.pipelineTypes.includes('gas')) {
      score += 30;
      affectedPipelines.push('燃气');
      riskPoints.push('燃气泄漏风险');
      riskPoints.push('动火作业风险');
    }
    if (cabin.pipelineTypes.includes('electric')) {
      score += 20;
      affectedPipelines.push('电力');
      riskPoints.push('带电作业风险');
    }
    if (cabin.pipelineTypes.includes('waterSupply') || cabin.pipelineTypes.includes('drainage')) {
      score += 15;
      affectedPipelines.push('给排水');
      riskPoints.push('水管破损风险');
    }
    if (cabin.pipelineTypes.includes('communication')) {
      score += 10;
      affectedPipelines.push('通信');
      riskPoints.push('通信线路误碰风险');
    }

    if (values.constructionType?.includes('改造') || values.constructionType?.includes('更换')) {
      score += 20;
      riskPoints.push('大型设备作业风险');
    } else if (values.constructionType?.includes('检修') || values.constructionType?.includes('维护')) {
      score += 5;
    }

    const duration = values.planTime[1].diff(values.planTime[0], 'hour');
    if (duration > 24) {
      score += 15;
      riskPoints.push('长时间作业疲劳风险');
    } else if (duration > 8) {
      score += 5;
    }

    const startHour = values.planTime[0].hour();
    if (startHour >= 22 || startHour < 6) {
      score += 10;
      riskPoints.push('夜间作业视线不佳风险');
    }

    if (cabin.status === 'warning') {
      score += 10;
      riskPoints.push('舱室当前处于预警状态');
    } else if (cabin.status === 'danger') {
      score += 25;
      riskPoints.push('舱室当前处于告警状态，建议暂缓施工');
    }

    let level: RiskLevel = 'low';
    if (score >= 70) level = 'high';
    else if (score >= 40) level = 'medium';

    let suggestedTimePeriod = '可随时施工';
    if (level === 'high') {
      suggestedTimePeriod = '建议09:00-17:00施工，需全程通风并安排专人监护';
    } else if (level === 'medium') {
      suggestedTimePeriod = '建议08:00-18:00施工，避开用气用电高峰时段';
    }

    setRiskAssessment({
      level,
      score,
      affectedPipelines,
      suggestedTimePeriod,
      riskPoints: [...new Set(riskPoints)],
    });
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    if (values.cabinId && values.constructionType && values.planTime) {
      evaluateRisk();
    }
  };

  const dummyRequest: UploadProps['customRequest'] = ({ file, onSuccess }) => {
    setTimeout(() => {
      onSuccess?.(file);
    }, 500);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!riskAssessment) {
        message.warning('请先选择施工舱段、类型和时段以进行风险评估');
        return;
      }
      if (!user) {
        message.error('请先登录');
        return;
      }

      setSubmitting(true);

      const schemeUrl = schemeFileList[0]?.url || '施工方案已上传';
      const commitmentUrl = commitmentFileList[0]?.url || '安全承诺书已上传';

      const pipelineUnitId = isPipelineUser() ? user.pipelineUnitId : undefined;
      const applicantUnit = isPipelineUser()
        ? user.pipelineUnitName || values.applicantUnit
        : values.applicantUnit;

      await api.createConstructionApply({
        applicantUnit,
        applicantName: values.applicantName,
        applicantPhone: values.applicantPhone,
        pipelineUnitId,
        projectName: values.projectName,
        constructionType: values.constructionType,
        cabinId: values.cabinId,
        cabinName: cabins.find((c) => c.id === values.cabinId)?.name,
        constructionArea: values.constructionArea,
        planStartTime: values.planTime[0].format('YYYY-MM-DD HH:mm:ss'),
        planEndTime: values.planTime[1].format('YYYY-MM-DD HH:mm:ss'),
        constructionScheme: schemeUrl,
        safetyCommitment: commitmentUrl,
        riskAssessment,
      });

      message.success('施工申请提交成功，请等待审批');
      form.resetFields();
      setSchemeFileList([]);
      setCommitmentFileList([]);
      setRiskAssessment(null);

      if (isPipelineUser()) {
        const unit = pipelineUnits.find((u) => u.id === user.pipelineUnitId);
        form.setFieldsValue({
          applicantUnit: unit?.name || user.pipelineUnitName,
          applicantName: user.name,
        });
      }
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              入廊施工申请
            </h2>
            <p className="text-gray-400 text-sm">
              填写施工信息，系统将自动评估施工风险
            </p>
          </div>
          {isPipelineUser() && (
            <Tag color="blue" icon={<UserOutlined />}>
              管线单位用户：{user?.pipelineUnitName}
            </Tag>
          )}
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={14}>
          <Card
            title={<span className="text-white">施工信息</span>}
            className="bg-gray-800 border-gray-700 mb-6"
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="applicantUnit"
                    label={<span className="text-gray-300">施工单位</span>}
                    rules={[{ required: true, message: '请输入施工单位' }]}
                  >
                    {isPipelineUser() ? (
                      <Input
                        disabled
                        className="bg-gray-700 border-gray-600 text-white"
                        prefix={<EnvironmentOutlined className="text-gray-400" />}
                      />
                    ) : (
                      <Input
                        placeholder="请输入施工单位名称"
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                        prefix={<EnvironmentOutlined className="text-gray-400" />}
                      />
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="projectName"
                    label={<span className="text-gray-300">项目名称</span>}
                    rules={[{ required: true, message: '请输入项目名称' }]}
                  >
                    <Input
                      placeholder="请输入项目名称"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      prefix={<ProjectOutlined className="text-gray-400" />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="applicantName"
                    label={<span className="text-gray-300">负责人</span>}
                    rules={[{ required: true, message: '请输入负责人姓名' }]}
                  >
                    <Input
                      placeholder="请输入负责人姓名"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      prefix={<UserOutlined className="text-gray-400" />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="applicantPhone"
                    label={<span className="text-gray-300">联系电话</span>}
                    rules={[
                      { required: true, message: '请输入联系电话' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                    ]}
                  >
                    <Input
                      placeholder="请输入联系电话"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                      prefix={<PhoneOutlined className="text-gray-400" />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="cabinId"
                    label={<span className="text-gray-300">施工舱段</span>}
                    rules={[{ required: true, message: '请选择施工舱段' }]}
                  >
                    <Select
                      placeholder="请选择施工舱段"
                      className="w-full"
                      options={filteredCabins.map((c) => ({
                        label: `${c.name} - ${c.location}`,
                        value: c.id,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="constructionType"
                    label={<span className="text-gray-300">施工类型</span>}
                    rules={[{ required: true, message: '请选择施工类型' }]}
                  >
                    <Select
                      placeholder="请选择施工类型"
                      className="w-full"
                      disabled={!selectedCabin}
                      options={availableConstructionTypes.map((t) => ({
                        label: t,
                        value: t,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="constructionArea"
                label={<span className="text-gray-300">施工区域</span>}
                rules={[{ required: true, message: '请输入施工区域' }]}
              >
                <Input
                  placeholder="如：A1舱200-400米段"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                  prefix={<EnvironmentOutlined className="text-gray-400" />}
                />
              </Form.Item>

              <Form.Item
                name="planTime"
                label={<span className="text-gray-300">计划时段</span>}
                rules={[{ required: true, message: '请选择计划时段' }]}
              >
                <RangePicker
                  showTime
                  style={{ width: '100%' }}
                  className="bg-gray-700 border-gray-600"
                  placeholder={['开始时间', '结束时间']}
                  suffixIcon={<ClockCircleOutlined className="text-gray-400" />}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="constructionScheme"
                    label={<span className="text-gray-300">施工方案</span>}
                    rules={[{ required: true, message: '请上传施工方案' }]}
                  >
                    <Upload
                      fileList={schemeFileList}
                      onChange={({ fileList }) => setSchemeFileList(fileList)}
                      customRequest={dummyRequest}
                      maxCount={1}
                      accept=".pdf,.doc,.docx"
                    >
                      <Button
                        icon={<UploadOutlined />}
                        className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        上传施工方案
                      </Button>
                    </Upload>
                    {schemeFileList.length > 0 && (
                      <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                        <CheckCircleOutlined /> 施工方案已上传
                      </div>
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="safetyCommitment"
                    label={<span className="text-gray-300">安全承诺书</span>}
                    rules={[{ required: true, message: '请上传安全承诺书' }]}
                  >
                    <Upload
                      fileList={commitmentFileList}
                      onChange={({ fileList }) => setCommitmentFileList(fileList)}
                      customRequest={dummyRequest}
                      maxCount={1}
                      accept=".pdf,.doc,.docx"
                    >
                      <Button
                        icon={<SafetyOutlined />}
                        className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        上传安全承诺书
                      </Button>
                    </Upload>
                    {commitmentFileList.length > 0 && (
                      <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                        <CheckCircleOutlined /> 安全承诺书已上传
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item className="mb-0 mt-6">
                <Space>
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    loading={submitting}
                    className="bg-blue-500 hover:bg-blue-600 px-8"
                  >
                    提交申请
                  </Button>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setRiskAssessment(null);
                      setSchemeFileList([]);
                      setCommitmentFileList([]);
                    }}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={<span className="text-white">风险评估结果</span>}
            className="bg-gray-800 border-gray-700 mb-6"
            extra={
              riskAssessment && (
                <StatusBadge
                  status={riskAssessment.level}
                  label={riskLevelLabels[riskAssessment.level]}
                  color={riskLevelColors[riskAssessment.level]}
                  pulse={riskAssessment.level === 'high'}
                />
              )
            }
          >
            {!riskAssessment ? (
              <div className="text-center py-12">
                <InfoCircleOutlined className="text-4xl text-gray-500 mb-4" />
                <p className="text-gray-400">请先选择施工舱段、类型和时段</p>
                <p className="text-gray-500 text-sm mt-2">系统将根据管线分布自动评估风险等级</p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">风险评分</span>
                    <span
                      className="text-xl font-bold"
                      style={{ color: riskLevelColors[riskAssessment.level] }}
                    >
                      {riskAssessment.score} 分
                    </span>
                  </div>
                  <Progress
                    percent={riskAssessment.score}
                    strokeColor={riskLevelColors[riskAssessment.level]}
                    showInfo={false}
                  />
                </div>

                {riskAssessment.level === 'high' && (
                  <Alert
                    message="高风险提醒"
                    description="该施工区域风险等级较高，需要严格审批并落实安全措施"
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    className="mb-4"
                  />
                )}

                <Descriptions
                  column={1}
                  size="small"
                  labelStyle={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: '#9ca3af',
                    width: '120px',
                  }}
                  contentStyle={{ color: '#fff' }}
                  className="mb-4"
                >
                  <Descriptions.Item label="风险等级">
                    <Tag color={riskLevelColors[riskAssessment.level]}>
                      {riskLevelLabels[riskAssessment.level]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="影响管线">
                    <Space wrap>
                      {riskAssessment.affectedPipelines.map((p, idx) => (
                        <Tag key={idx} color="blue">{p}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>

                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <WarningOutlined className="text-yellow-400" />
                    风险点提示
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {riskAssessment.riskPoints.map((rp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        {rp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <ClockCircleOutlined className="text-green-400" />
                    建议施工时段
                  </div>
                  <p className="text-white">{riskAssessment.suggestedTimePeriod}</p>
                </div>
              </div>
            )}
          </Card>

          <Card
            title={<span className="text-white">申请须知</span>}
            className="bg-gray-800 border-gray-700"
          >
            <div className="text-gray-300 text-sm space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">1.</span>
                <span>施工申请需提前3个工作日提交，审批通过后方可入廊施工</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">2.</span>
                <span>高风险施工需制定专项安全方案，并安排专人现场监护</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">3.</span>
                <span>施工人员必须接受入廊安全教育，佩戴安全防护设备</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">4.</span>
                <span>超时未完工系统将自动触发催办，多次超时将影响后续申请</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">5.</span>
                <span>施工完成后需及时确认完工，以便解除区域锁定</span>
              </div>
              {isPipelineUser() && (
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">*</span>
                  <span className="text-orange-400">
                    管线单位用户只能申请本管线相关的施工项目
                  </span>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
