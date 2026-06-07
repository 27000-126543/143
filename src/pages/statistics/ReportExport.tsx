import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Eye,
  History,
  Filter,
  Calendar,
  Building,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Table,
  Tabs,
  message,
  Modal,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import dayjs from 'dayjs';
import { usePermission } from '@/hooks/usePermission';
import { api } from '@/services/api';
import {
  exportToExcel,
  exportMonthlyReport,
} from '@/utils/export';
import {
  formatDateTime,
  alarmLevelLabels,
  alarmLevelColors,
  workOrderLevelLabels,
  workOrderLevelColors,
  workOrderStatusLabels,
  workOrderStatusColors,
} from '@/utils/format';
import type {
  Alarm,
  WorkOrder,
  ConstructionApply,
  MaintenanceOrder,
  InspectionRecord,
  StatisticsData,
} from '@/types/models';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface ExportRecord {
  id: string;
  reportType: string;
  reportTypeName: string;
  createTime: string;
  createBy: string;
  status: 'success' | 'processing' | 'failed';
  filename: string;
}

const reportTypes = [
  { value: 'monthly', label: '月度运维分析报表' },
  { value: 'workOrder', label: '工单执行明细' },
  { value: 'alarm', label: '告警统计报表' },
  { value: 'inspection', label: '巡检完成率报表' },
];

const pipelineTypes = [
  { value: 'electric', label: '电力' },
  { value: 'communication', label: '通信' },
  { value: 'gas', label: '燃气' },
  { value: 'waterSupply', label: '供水' },
  { value: 'drainage', label: '排水' },
];

export default function ReportExport() {
  const { canViewAllData } = usePermission();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [constructions, setConstructions] = useState<ConstructionApply[]>([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState<MaintenanceOrder[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState('export');

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        alarmsData,
        workOrdersData,
        constructionsData,
        maintenanceOrdersData,
        inspectionRecordsData,
        statisticsData,
      ] = await Promise.all([
        api.getAlarms(),
        api.getWorkOrders(),
        api.getConstructionApplies(),
        api.getMaintenanceOrders(),
        api.getInspectionRecords(),
        api.getStatistics(),
      ]);
      setAlarms(alarmsData);
      setWorkOrders(workOrdersData);
      setConstructions(constructionsData);
      setMaintenanceOrders(maintenanceOrdersData);
      setInspectionRecords(inspectionRecordsData);
      setStatistics(statisticsData);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await loadData();

    let data: any[] = [];
    let title = '';

    switch (values.reportType) {
      case 'monthly':
        title = '月度运维分析报表';
        data = statistics ? [
          { 指标名称: '环境达标率', 数值: `${statistics.environmentComplianceRate}%` },
          { 指标名称: '设备完好率', 数值: `${statistics.deviceIntactRate}%` },
          { 指标名称: '隐患整改进度', 数值: `${statistics.hazardRectificationProgress}%` },
          { 指标名称: '施工占用量', 数值: `${statistics.constructionOccupancy}%` },
          { 指标名称: '本月告警数', 数值: statistics.alarmCount.month },
          { 指标名称: '待处理工单数', 数值: statistics.workOrderCount.pending },
          { 指标名称: '处理中工单数', 数值: statistics.workOrderCount.processing },
          { 指标名称: '已完成工单数', 数值: statistics.workOrderCount.completed },
          { 指标名称: '超时工单数', 数值: statistics.workOrderCount.overdue },
        ] : [];
        break;
      case 'workOrder':
        title = '工单执行明细';
        data = workOrders.map((o) => ({
          工单号: o.orderNo,
          工单类型: { rectify: '整改工单', maintenance: '维保工单', construction: '施工工单' }[o.type] || o.type,
          优先级: workOrderLevelLabels[o.level],
          工单标题: o.title,
          所属舱段: o.cabinName,
          负责人: o.assigneeName,
          状态: workOrderStatusLabels[o.status],
          截止时间: formatDateTime(o.deadline),
          创建人: o.createdByName,
          创建时间: formatDateTime(o.createdAt),
        }));
        break;
      case 'alarm':
        title = '告警统计报表';
        data = alarms.map((a) => ({
          告警ID: a.id,
          告警级别: alarmLevelLabels[a.level],
          告警标题: a.title,
          告警描述: a.description,
          当前值: a.sensorValue ?? '-',
          阈值: a.threshold ?? '-',
          状态: a.status,
          确认人: a.acknowledgedByName ?? '-',
          确认时间: a.acknowledgedAt ? formatDateTime(a.acknowledgedAt) : '-',
          创建时间: formatDateTime(a.createdAt),
        }));
        break;
      case 'inspection':
        title = '巡检完成率报表';
        data = inspectionRecords.map((r) => ({
          记录ID: r.id,
          巡检路线: r.routeName,
          巡检员: r.inspectorName,
          检查点: r.checkPointName,
          所属舱段: r.cabinId,
          签到时间: formatDateTime(r.checkInTime),
          状态: r.status === 'normal' ? '正常' : '异常',
          备注: r.remark ?? '-',
        }));
        break;
    }

    setPreviewTitle(title);
    setPreviewData(data);
    setPreviewVisible(true);
  };

  const handleExport = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    await loadData();

    const reportType = reportTypes.find((t) => t.value === values.reportType);
    const record: ExportRecord = {
      id: `export-${Date.now()}`,
      reportType: values.reportType,
      reportTypeName: reportType?.label || '',
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createBy: '当前用户',
      status: 'processing',
      filename: `${reportType?.label}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
    };
    setExportRecords([record, ...exportRecords]);

    try {
      switch (values.reportType) {
        case 'monthly':
          if (statistics) {
            exportMonthlyReport(statistics, alarms, workOrders, constructions, maintenanceOrders);
          }
          break;
        case 'workOrder':
          const workOrderColumns = [
            { key: 'orderNo', title: '工单号' },
            { key: 'type', title: '工单类型', formatter: (v: string) => ({ rectify: '整改工单', maintenance: '维保工单', construction: '施工工单' }[v] || v) },
            { key: 'level', title: '优先级', formatter: (v: string) => workOrderLevelLabels[v as keyof typeof workOrderLevelLabels] || v },
            { key: 'title', title: '工单标题' },
            { key: 'cabinName', title: '所属舱段' },
            { key: 'assigneeName', title: '负责人' },
            { key: 'status', title: '状态', formatter: (v: string) => workOrderStatusLabels[v as keyof typeof workOrderStatusLabels] || v },
            { key: 'deadline', title: '截止时间', formatter: (v: string) => formatDateTime(v) },
            { key: 'createdByName', title: '创建人' },
            { key: 'createdAt', title: '创建时间', formatter: (v: string) => formatDateTime(v) },
          ];
          exportToExcel(workOrders, workOrderColumns, {
            filename: `工单执行明细_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
            sheetName: '工单明细',
          });
          break;
        case 'alarm':
          const alarmColumns = [
            { key: 'id', title: '告警ID' },
            { key: 'level', title: '告警级别', formatter: (v: string) => alarmLevelLabels[v as keyof typeof alarmLevelLabels] || v },
            { key: 'title', title: '告警标题' },
            { key: 'description', title: '告警描述' },
            { key: 'sensorValue', title: '当前值', formatter: (v: any) => v ?? '-' },
            { key: 'threshold', title: '阈值', formatter: (v: any) => v ?? '-' },
            { key: 'status', title: '状态' },
            { key: 'acknowledgedByName', title: '确认人', formatter: (v: any) => v ?? '-' },
            { key: 'acknowledgedAt', title: '确认时间', formatter: (v: string) => v ? formatDateTime(v) : '-' },
            { key: 'createdAt', title: '创建时间', formatter: (v: string) => formatDateTime(v) },
          ];
          exportToExcel(alarms, alarmColumns, {
            filename: `告警统计报表_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
            sheetName: '告警统计',
          });
          break;
        case 'inspection':
          const inspectionColumns = [
            { key: 'id', title: '记录ID' },
            { key: 'routeName', title: '巡检路线' },
            { key: 'inspectorName', title: '巡检员' },
            { key: 'checkPointName', title: '检查点' },
            { key: 'cabinId', title: '所属舱段' },
            { key: 'checkInTime', title: '签到时间', formatter: (v: string) => formatDateTime(v) },
            { key: 'status', title: '状态', formatter: (v: string) => v === 'normal' ? '正常' : '异常' },
            { key: 'remark', title: '备注', formatter: (v: any) => v ?? '-' },
          ];
          exportToExcel(inspectionRecords, inspectionColumns, {
            filename: `巡检完成率报表_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`,
            sheetName: '巡检记录',
          });
          break;
      }

      setExportRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, status: 'success' } : r
        )
      );
      message.success('导出成功');
    } catch {
      setExportRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, status: 'failed' } : r
        )
      );
      message.error('导出失败');
    }
  };

  const previewColumns = useMemo(() => {
    if (previewData.length === 0) return [];
    const keys = Object.keys(previewData[0]);
    return keys.map((key) => ({
      title: key,
      dataIndex: key,
      key,
    }));
  }, [previewData]);

  const historyColumns = [
    {
      title: '报表类型',
      dataIndex: 'reportTypeName',
      key: 'reportTypeName',
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '导出时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '导出人',
      dataIndex: 'createBy',
      key: 'createBy',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string; icon: any }> = {
          success: { color: 'success', text: '成功', icon: CheckCircle2 },
          processing: { color: 'processing', text: '处理中', icon: Clock },
          failed: { color: 'error', text: '失败', icon: Clock },
        };
        const s = statusMap[status];
        const Icon = s.icon;
        return (
          <Tag color={s.color}>
            <Icon size={12} className="mr-1 inline" />
            {s.text}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link" size="small" icon={<Download size={12} />}>
          下载
        </Button>
      ),
    },
  ];

  const summaryData = useMemo(() => {
    if (!statistics) return null;
    return [
      { title: '环境达标率', value: `${statistics.environmentComplianceRate}%`, color: '#10b981' },
      { title: '设备完好率', value: `${statistics.deviceIntactRate}%`, color: '#3b82f6' },
      { title: '隐患整改进度', value: `${statistics.hazardRectificationProgress}%`, color: '#f97316' },
      { title: '施工占用量', value: `${statistics.constructionOccupancy}%`, color: '#ef4444' },
    ];
  }, [statistics]);

  if (!canViewAllData()) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileSpreadsheet size={48} className="text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">权限不足</h2>
          <p className="text-gray-400">仅管理员和运行主管可查看报表导出</p>
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
          <h1 className="text-2xl font-bold text-white">报表导出</h1>
          <p className="text-gray-400 text-sm mt-1">生成并导出各类运维数据报表</p>
        </div>
      </div>

      <Card className="data-card mb-6" size="small">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <FileSpreadsheet size={14} className="mr-1" />
                报表导出
              </span>
            }
            key="export"
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                reportType: 'monthly',
                dateRange: [dayjs().subtract(1, 'month'), dayjs()],
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    name="reportType"
                    label="报表类型"
                    rules={[{ required: true, message: '请选择报表类型' }]}
                  >
                    <Select placeholder="请选择报表类型">
                      {reportTypes.map((type) => (
                        <Option key={type.value} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="cabinId" label="舱段">
                    <Select placeholder="选择舱段" allowClear>
                      <Option value="1">A1综合舱</Option>
                      <Option value="2">A2燃气舱</Option>
                      <Option value="3">B1给排水舱</Option>
                      <Option value="4">B2综合舱</Option>
                      <Option value="5">C1综合舱</Option>
                      <Option value="6">C2燃气舱</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="pipelineType" label="管线类型">
                    <Select placeholder="选择管线类型" allowClear>
                      {pipelineTypes.map((type) => (
                        <Option key={type.value} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="dateRange"
                    label="时间范围"
                    rules={[{ required: true, message: '请选择时间范围' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              {summaryData && (
                <Row gutter={16} className="mb-4">
                  {summaryData.map((item, idx) => (
                    <Col span={6} key={idx}>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <Statistic
                          title={<span className="text-gray-400 text-sm">{item.title}</span>}
                          value={item.value}
                          valueStyle={{ color: item.color, fontSize: '24px' }}
                        />
                      </div>
                    </Col>
                  ))}
                </Row>
              )}

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<Eye size={14} />}
                    onClick={handlePreview}
                    loading={loading}
                  >
                    预览报表
                  </Button>
                  <Button
                    type="primary"
                    icon={<Download size={14} />}
                    onClick={handleExport}
                    loading={loading}
                  >
                    导出Excel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane
            tab={
              <span>
                <History size={14} className="mr-1" />
                历史记录
              </span>
            }
            key="history"
          >
            <Table
              columns={historyColumns}
              dataSource={exportRecords}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<Download size={14} />}
            onClick={() => {
              setPreviewVisible(false);
              handleExport();
            }}
          >
            导出Excel
          </Button>,
        ]}
      >
        <div className="mb-4 text-gray-400 text-sm">
          共 {previewData.length} 条记录
        </div>
        <div className="max-h-[500px] overflow-auto">
          <Table
            columns={previewColumns}
            dataSource={previewData}
            rowKey={(record, index) => index?.toString() || ''}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Modal>
    </motion.div>
  );
}
