import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  AlertTriangle,
  Bell,
  Shield,
  Clock,
  Wrench,
  Save,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Space,
  Tabs,
  message,
  Row,
  Col,
  Divider,
  Switch,
  Typography,
  Tag,
} from 'antd';
import { usePermission } from '@/hooks/usePermission';
import { sensorTypeLabels } from '@/utils/format';
import type { SensorType } from '@/types/models';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface SensorThreshold {
  type: SensorType;
  warning: number;
  danger: number;
  unit: string;
}

interface SystemConfigData {
  sensorThresholds: SensorThreshold[];
  escalation: {
    alarmUnconfirmedMinutes: number;
    workOrderUnclosedHours: number;
  };
  constructionRisk: {
    highRiskScore: number;
    mediumRiskScore: number;
    enableGasWarning: boolean;
    enableHighVoltageWarning: boolean;
    enableConfinedSpaceWarning: boolean;
  };
  maintenance: {
    fanCycleDays: number;
    pumpCycleDays: number;
    sensorCalibrationDays: number;
    doorInspectionDays: number;
    cameraInspectionDays: number;
  };
}

const defaultSensorThresholds: SensorThreshold[] = [
  { type: 'temperature', warning: 35, danger: 40, unit: '℃' },
  { type: 'humidity', warning: 80, danger: 90, unit: '%' },
  { type: 'methane', warning: 0.5, danger: 1.0, unit: '%LEL' },
  { type: 'hydrogenSulfide', warning: 10, danger: 20, unit: 'ppm' },
  { type: 'liquidLevel', warning: 50, danger: 80, unit: 'cm' },
  { type: 'waterImmersion', warning: 1, danger: 2, unit: '级' },
];

export default function SystemConfig() {
  const { isAdmin } = usePermission();
  const [form] = Form.useForm<SystemConfigData>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('threshold');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const config: SystemConfigData = {
        sensorThresholds: defaultSensorThresholds,
        escalation: {
          alarmUnconfirmedMinutes: 15,
          workOrderUnclosedHours: 48,
        },
        constructionRisk: {
          highRiskScore: 80,
          mediumRiskScore: 50,
          enableGasWarning: true,
          enableHighVoltageWarning: true,
          enableConfinedSpaceWarning: true,
        },
        maintenance: {
          fanCycleDays: 30,
          pumpCycleDays: 90,
          sensorCalibrationDays: 30,
          doorInspectionDays: 180,
          cameraInspectionDays: 90,
        },
      };
      
      form.setFieldsValue(config);
    } catch {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('保存配置:', values);
      message.success('配置保存成功');
    } catch {
      message.error('保存失败，请检查输入');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
    message.info('已重置为默认配置');
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={48} className="text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">权限不足</h2>
          <p className="text-gray-400">仅管理员可配置系统参数</p>
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
          <h1 className="text-2xl font-bold text-white">系统配置</h1>
          <p className="text-gray-400 text-sm mt-1">配置系统运行参数与业务规则</p>
        </div>
        <Space>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={handleReset}
            loading={loading}
          >
            重置
          </Button>
          <Button
            type="primary"
            icon={<Save size={14} />}
            onClick={handleSave}
            loading={saving}
          >
            保存配置
          </Button>
        </Space>
      </div>

      <Card className="data-card" size="small" loading={loading}>
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  <AlertCircle size={14} className="mr-1" />
                  告警阈值配置
                </span>
              }
              key="threshold"
            >
              <div className="mb-4">
                <Text type="secondary">
                  配置各传感器类型的预警值和危险值，当传感器数据超过阈值时将触发相应级别的告警。
                </Text>
              </div>
              
              <Row gutter={[24, 24]}>
                {defaultSensorThresholds.map((sensor, index) => (
                  <Col span={12} key={sensor.type}>
                    <Card
                      size="small"
                      className="bg-gray-800/50 border-gray-700"
                      title={
                        <Space>
                          <span className="text-white">{sensorTypeLabels[sensor.type]}</span>
                          <Tag color="blue">{sensor.unit}</Tag>
                        </Space>
                      }
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name={['sensorThresholds', index, 'warning']}
                            label={
                              <span className="text-warning-500">
                                <Bell size={12} className="mr-1" />
                                预警值
                              </span>
                            }
                            rules={[{ required: true, message: '请输入预警值' }]}
                          >
                            <InputNumber
                              min={0}
                              step={sensor.type === 'methane' ? 0.1 : 1}
                              precision={sensor.type === 'methane' ? 1 : 0}
                              style={{ width: '100%' }}
                              placeholder="请输入预警阈值"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name={['sensorThresholds', index, 'danger']}
                            label={
                              <span className="text-danger-500">
                                <AlertTriangle size={12} className="mr-1" />
                                危险值
                              </span>
                            }
                            rules={[{ required: true, message: '请输入危险值' }]}
                          >
                            <InputNumber
                              min={0}
                              step={sensor.type === 'methane' ? 0.1 : 1}
                              precision={sensor.type === 'methane' ? 1 : 0}
                              style={{ width: '100%' }}
                              placeholder="请输入危险阈值"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <Clock size={14} className="mr-1" />
                  升级时间配置
                </span>
              }
              key="escalation"
            >
              <div className="mb-4">
                <Text type="secondary">
                  配置告警和工单的自动升级规则，超时未处理将自动升级到上级责任人。
                </Text>
              </div>
              
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title={
                      <Space>
                        <Bell size={16} className="text-warning-500" />
                        <span className="text-white">告警升级配置</span>
                      </Space>
                    }
                  >
                    <Form.Item
                      name={['escalation', 'alarmUnconfirmedMinutes']}
                      label="告警未确认自动升级时间"
                      rules={[{ required: true, message: '请输入升级时间' }]}
                      extra="告警产生后超过该时间未确认，将自动升级给运行主管"
                    >
                      <InputNumber
                        min={5}
                        max={120}
                        addonAfter="分钟"
                        style={{ width: '100%' }}
                        placeholder="请输入分钟数"
                      />
                    </Form.Item>
                    <div className="text-gray-400 text-sm">
                      <AlertCircle size={12} className="mr-1 inline text-warning-500" />
                      当前设置: 告警 15 分钟未确认自动升级
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title={
                      <Space>
                        <Wrench size={16} className="text-primary-500" />
                        <span className="text-white">工单升级配置</span>
                      </Space>
                    }
                  >
                    <Form.Item
                      name={['escalation', 'workOrderUnclosedHours']}
                      label="工单未闭环自动升级时间"
                      rules={[{ required: true, message: '请输入升级时间' }]}
                      extra="工单创建后超过该时间未闭环，将自动升级给部门负责人"
                    >
                      <InputNumber
                        min={1}
                        max={168}
                        addonAfter="小时"
                        style={{ width: '100%' }}
                        placeholder="请输入小时数"
                      />
                    </Form.Item>
                    <div className="text-gray-400 text-sm">
                      <AlertCircle size={12} className="mr-1 inline text-warning-500" />
                      当前设置: 工单 48 小时未闭环自动升级
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <Shield size={14} className="mr-1" />
                  施工风险评估规则
                </span>
              }
              key="construction"
            >
              <div className="mb-4">
                <Text type="secondary">
                  配置施工风险评估的评分规则和特殊风险预警开关。
                </Text>
              </div>
              
              <Row gutter={[24, 24]}>
                <Col span={12}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title={
                      <Space>
                        <AlertTriangle size={16} className="text-danger-500" />
                        <span className="text-white">风险等级阈值</span>
                      </Space>
                    }
                  >
                    <Form.Item
                      name={['constructionRisk', 'highRiskScore']}
                      label={
                        <span className="text-danger-500">高风险分数线</span>
                      }
                      rules={[{ required: true, message: '请输入高风险分数线' }]}
                      extra="风险评分大于等于该值判定为高风险"
                    >
                      <InputNumber
                        min={50}
                        max={100}
                        addonAfter="分"
                        style={{ width: '100%' }}
                        placeholder="请输入高风险分数线"
                      />
                    </Form.Item>
                    <Form.Item
                      name={['constructionRisk', 'mediumRiskScore']}
                      label={
                        <span className="text-warning-500">中风险分数线</span>
                      }
                      rules={[{ required: true, message: '请输入中风险分数线' }]}
                      extra="风险评分大于等于该值且小于高风险分数线判定为中风险"
                    >
                      <InputNumber
                        min={0}
                        max={80}
                        addonAfter="分"
                        style={{ width: '100%' }}
                        placeholder="请输入中风险分数线"
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title={
                      <Space>
                        <Shield size={16} className="text-primary-500" />
                        <span className="text-white">特殊风险预警</span>
                      </Space>
                    }
                  >
                    <Form.Item
                      name={['constructionRisk', 'enableGasWarning']}
                      label="燃气作业预警"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name={['constructionRisk', 'enableHighVoltageWarning']}
                      label="高压作业预警"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name={['constructionRisk', 'enableConfinedSpaceWarning']}
                      label="受限空间作业预警"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <div className="text-gray-400 text-sm mt-2">
                      <AlertCircle size={12} className="mr-1 inline text-info-500" />
                      开启后，涉及相关作业的施工申请将自动提升风险等级并加强审批
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <Wrench size={14} className="mr-1" />
                  维保周期配置
                </span>
              }
              key="maintenance"
            >
              <div className="mb-4">
                <Text type="secondary">
                  配置各类设备和系统的维保周期，系统将根据周期自动生成维保工单。
                </Text>
              </div>
              
              <Row gutter={[24, 24]}>
                <Col span={8}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title="排风机"
                  >
                    <Form.Item
                      name={['maintenance', 'fanCycleDays']}
                      label="维保周期"
                      rules={[{ required: true, message: '请输入维保周期' }]}
                    >
                      <InputNumber
                        min={7}
                        max={365}
                        addonAfter="天"
                        style={{ width: '100%' }}
                        placeholder="请输入天数"
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title="水泵"
                  >
                    <Form.Item
                      name={['maintenance', 'pumpCycleDays']}
                      label="维保周期"
                      rules={[{ required: true, message: '请输入维保周期' }]}
                    >
                      <InputNumber
                        min={7}
                        max={365}
                        addonAfter="天"
                        style={{ width: '100%' }}
                        placeholder="请输入天数"
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title="传感器校准"
                  >
                    <Form.Item
                      name={['maintenance', 'sensorCalibrationDays']}
                      label="校准周期"
                      rules={[{ required: true, message: '请输入校准周期' }]}
                    >
                      <InputNumber
                        min={7}
                        max={365}
                        addonAfter="天"
                        style={{ width: '100%' }}
                        placeholder="请输入天数"
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title="防火门检查"
                  >
                    <Form.Item
                      name={['maintenance', 'doorInspectionDays']}
                      label="检查周期"
                      rules={[{ required: true, message: '请输入检查周期' }]}
                    >
                      <InputNumber
                        min={30}
                        max={365}
                        addonAfter="天"
                        style={{ width: '100%' }}
                        placeholder="请输入天数"
                      />
                    </Form.Item>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card
                    size="small"
                    className="bg-gray-800/50 border-gray-700"
                    title="摄像机检查"
                  >
                    <Form.Item
                      name={['maintenance', 'cameraInspectionDays']}
                      label="检查周期"
                      rules={[{ required: true, message: '请输入检查周期' }]}
                    >
                      <InputNumber
                        min={30}
                        max={365}
                        addonAfter="天"
                        style={{ width: '100%' }}
                        placeholder="请输入天数"
                      />
                    </Form.Item>
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </motion.div>
  );
}
