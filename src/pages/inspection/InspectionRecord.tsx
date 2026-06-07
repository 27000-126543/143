import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Tag,
  DatePicker,
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
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  QrcodeOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PushpinOutlined,
  UserOutlined,
  FlagOutlined,
  UploadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import type {
  InspectionRecord,
  InspectionRoute,
  User,
  Cabin,
  CheckPoint,
} from '@/types/models';
import { formatDateTime, getTimeAgo } from '@/utils/format';
import { usePermission } from '@/hooks/usePermission';
import StatusBadge from '@/components/common/StatusBadge';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

interface FilterFormData {
  inspectorId?: string;
  routeId?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  status?: string;
}

interface CheckInFormData {
  checkPointId: string;
  remark?: string;
  status: 'normal' | 'abnormal';
}

export default function InspectionRecords() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [routes, setRoutes] = useState<InspectionRoute[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<InspectionRecord | null>(null);
  const [checkInForm] = Form.useForm<CheckInFormData>();
  const [filterForm] = Form.useForm<FilterFormData>();
  const [photoList, setPhotoList] = useState<UploadFile[]>([]);
  const { hasPermission, user } = usePermission();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordData, routeData, cabinData, userData] = await Promise.all([
        api.getInspectionRecords(),
        api.getInspectionRoutes(),
        api.getCabins(),
        api.getUsers(),
      ]);
      setRecords(recordData);
      setFilteredRecords(recordData);
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

  const handleSearch = (values: FilterFormData) => {
    let filtered = [...records];

    if (values.inspectorId) {
      filtered = filtered.filter((r) => r.inspectorId === values.inspectorId);
    }
    if (values.routeId) {
      filtered = filtered.filter((r) => r.routeId === values.routeId);
    }
    if (values.dateRange && values.dateRange.length === 2) {
      const start = values.dateRange[0].startOf('day');
      const end = values.dateRange[1].endOf('day');
      filtered = filtered.filter((r) => {
        const checkInTime = dayjs(r.checkInTime);
        return checkInTime.isAfter(start) && checkInTime.isBefore(end);
      });
    }
    if (values.status) {
      filtered = filtered.filter((r) => r.status === values.status);
    }

    setFilteredRecords(filtered);
  };

  const handleReset = () => {
    filterForm.resetFields();
    setFilteredRecords(records);
  };

  const handleCheckIn = () => {
    checkInForm.resetFields();
    checkInForm.setFieldsValue({ status: 'normal' });
    setPhotoList([]);
    setCheckInModalVisible(true);
  };

  const handleCheckInSubmit = async () => {
    try {
      const values = await checkInForm.validateFields();
      if (!user) {
        message.error('请先登录');
        return;
      }

      const newRecord = await api.checkIn(
        values.checkPointId,
        user.id,
        user.name
      );

      const recordWithExtra = {
        ...newRecord,
        status: values.status,
        remark: values.remark,
      };

      setRecords([recordWithExtra, ...records]);
      setFilteredRecords([recordWithExtra, ...filteredRecords]);
      message.success('打卡成功');
      setCheckInModalVisible(false);
    } catch (error) {
      message.error('打卡失败');
    }
  };

  const handleViewDetail = (record: InspectionRecord) => {
    setViewingRecord(record);
    setDetailVisible(true);
  };

  const getCabinName = (cabinId: string) => {
    return cabins.find((c) => c.id === cabinId)?.name || cabinId;
  };

  const getRouteName = (routeId: string) => {
    return routes.find((r) => r.id === routeId)?.name || routeId;
  };

  const getCheckPoints = (): CheckPoint[] => {
    const points: CheckPoint[] = [];
    routes.forEach((route) => {
      route.checkPoints.forEach((point) => {
        points.push(point);
      });
    });
    return points;
  };

  const statistics = {
    total: records.length,
    normal: records.filter((r) => r.status === 'normal').length,
    abnormal: records.filter((r) => r.status === 'abnormal').length,
    today: records.filter((r) =>
      dayjs(r.checkInTime).isSame(dayjs(), 'day')
    ).length,
  };

  const columns: ColumnsType<InspectionRecord> = [
    {
      title: '巡检员',
      dataIndex: 'inspectorName',
      key: 'inspectorName',
      render: (text) => (
        <Space>
          <UserOutlined className="text-blue-400" />
          <span className="text-white">{text}</span>
        </Space>
      ),
    },
    {
      title: '巡检路线',
      dataIndex: 'routeName',
      key: 'routeName',
      render: (text, record) => (
        <Space>
          <FlagOutlined className="text-purple-400" />
          <span className="text-white">{text}</span>
          <Tag color="geekblue">
            {record.checkPointName}
          </Tag>
        </Space>
      ),
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
            <div className="text-gray-500 text-xs">{record.checkPointName}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '打卡时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (time) => (
        <div>
          <div className="text-white">{formatDateTime(time)}</div>
          <div className="text-gray-500 text-xs">{getTimeAgo(time)}</div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.checkInTime).unix() - dayjs(b.checkInTime).unix(),
    },
    {
      title: '是否正常',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <StatusBadge
          status={status}
          label={status === 'normal' ? '正常' : '异常'}
          color={status === 'normal' ? '#10b981' : '#ef4444'}
        />
      ),
    },
    {
      title: '照片',
      key: 'photo',
      render: () => (
        <Space>
          <Image
            width={40}
            height={40}
            className="rounded"
            src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underground%20utility%20tunnel%20inspection%20photo&image_size=square"
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card className="bg-dark-800 border-dark-700 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              巡检打卡记录
            </h2>
            <p className="text-gray-400 text-sm">
              查看和管理巡检打卡记录，支持扫码打卡
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
            {hasPermission('inspection:checkin') && (
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={handleCheckIn}
                className="bg-green-500 hover:bg-green-600"
              >
                扫码打卡
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">总打卡次数</span>}
              value={statistics.total}
              prefix={<ClockCircleOutlined className="text-blue-400" />}
              className="text-white"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">今日打卡</span>}
              value={statistics.today}
              prefix={<CalendarOutlined className="text-purple-400" />}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">正常</span>}
              value={statistics.normal}
              prefix={<CheckCircleOutlined className="text-green-400" />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-dark-800 border-dark-700">
            <Statistic
              title={<span className="text-gray-400">异常</span>}
              value={statistics.abnormal}
              prefix={<ExclamationCircleOutlined className="text-red-400" />}
              valueStyle={{ color: '#ef4444' }}
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
          <Form.Item name="inspectorId" label="巡检员">
            <Select
              placeholder="选择巡检员"
              allowClear
              className="w-40"
              options={users
                .filter((u) => u.role === 'inspector' || u.role === 'admin')
                .map((u) => ({ label: u.name, value: u.id }))}
            />
          </Form.Item>
          <Form.Item name="routeId" label="巡检路线">
            <Select
              placeholder="选择路线"
              allowClear
              className="w-48"
              options={routes.map((r) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker className="w-64" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              placeholder="选择状态"
              allowClear
              className="w-32"
              options={[
                { label: '正常', value: 'normal' },
                { label: '异常', value: 'abnormal' },
              ]}
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
          dataSource={filteredRecords}
          rowKey="id"
          loading={loading}
          className="bg-dark-800"
          pagination={{
            pageSize: 10,
            className: '!bg-dark-800',
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={<span className="text-white">扫码打卡</span>}
        open={checkInModalVisible}
        onOk={handleCheckInSubmit}
        onCancel={() => setCheckInModalVisible(false)}
        okText="确认打卡"
        cancelText="取消"
        width={600}
        className="dark-modal"
      >
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 bg-dark-700 rounded-lg flex items-center justify-center border-2 border-dashed border-dark-600">
              <div className="text-center">
                <QrcodeOutlined className="text-6xl text-blue-400 block mb-2" />
                <p className="text-gray-400 text-sm">扫描巡检点二维码</p>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-center text-xs">
            模拟扫码功能，请手动选择巡检点
          </p>
        </div>

        <Form form={checkInForm} layout="vertical">
          <Form.Item
            name="checkPointId"
            label={<span className="text-gray-300">巡检点</span>}
            rules={[{ required: true, message: '请选择巡检点' }]}
          >
            <Select
              placeholder="请选择巡检点"
              className="w-full"
              options={getCheckPoints().map((cp) => ({
                label: `${cp.name} (${getCabinName(cp.cabinId)})`,
                value: cp.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span className="text-gray-300">检查状态</span>}
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              className="w-full"
              options={[
                { label: '正常', value: 'normal' },
                { label: '异常', value: 'abnormal' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="remark"
            label={<span className="text-gray-300">备注说明</span>}
          >
            <TextArea
              rows={3}
              placeholder="请输入备注说明（如有异常请详细描述）"
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
        </Form>
      </Modal>

      <Modal
        title={<span className="text-white">打卡详情</span>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
        className="dark-modal"
      >
        {viewingRecord && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">巡检员</div>
                <div className="text-white flex items-center gap-2">
                  <UserOutlined className="text-blue-400" />
                  {viewingRecord.inspectorName}
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">打卡时间</div>
                <div className="text-white flex items-center gap-2">
                  <ClockCircleOutlined className="text-green-400" />
                  {formatDateTime(viewingRecord.checkInTime)}
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">巡检路线</div>
                <div className="text-white flex items-center gap-2">
                  <FlagOutlined className="text-purple-400" />
                  {viewingRecord.routeName}
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">巡检点</div>
                <div className="text-white flex items-center gap-2">
                  <PushpinOutlined className="text-cyan-400" />
                  {viewingRecord.checkPointName}
                </div>
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4 mb-6">
              <div className="text-gray-400 text-sm mb-2">位置信息</div>
              <div className="text-white">
                {getCabinName(viewingRecord.cabinId)} -{' '}
                {viewingRecord.checkPointName}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="text-gray-400 text-sm">检查状态</div>
                <StatusBadge
                  status={viewingRecord.status}
                  label={viewingRecord.status === 'normal' ? '正常' : '异常'}
                  color={
                    viewingRecord.status === 'normal' ? '#10b981' : '#ef4444'
                  }
                />
              </div>
              {viewingRecord.remark && (
                <div className="text-white mt-2">
                  <div className="text-gray-400 text-sm mb-1">备注说明</div>
                  <div className="bg-dark-800 rounded p-3">
                    {viewingRecord.remark}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-dark-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-3">现场照片</div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3].map((i) => (
                  <Image
                    key={i}
                    width="100%"
                    height={100}
                    className="rounded object-cover"
                    src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=underground%20utility%20tunnel%20inspection%20checkpoint%20${i}&image_size=square`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


