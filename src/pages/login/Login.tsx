import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { getDefaultRoute } from '@/router/routes';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useUserStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      const user = useUserStore.getState().user;
      if (user) {
        navigate(getDefaultRoute(user.role));
      }
    } catch (error: any) {
      message.error(error.message || '登录失败');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/30"
          >
            <LogIn size={36} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white font-mono mb-2">智慧城市管廊运维</h1>
          <p className="text-gray-400">安全管理平台</p>
        </div>

        <Card className="bg-dark-800/80 backdrop-blur-xl border-dark-700 rounded-2xl shadow-2xl">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              name="username"
              label={<span className="text-gray-300">用户名</span>}
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                size="large"
                prefix={<User size={18} className="text-gray-500" />}
                placeholder="请输入用户名"
                className="h-12"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-gray-300">密码</span>}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                prefix={<Lock size={18} className="text-gray-500" />}
                placeholder="请输入密码"
                className="h-12"
                iconRender={(visible) =>
                  visible ? (
                    <Eye size={18} className="text-gray-500 cursor-pointer" onClick={() => setShowPassword(!visible)} />
                  ) : (
                    <EyeOff size={18} className="text-gray-500 cursor-pointer" onClick={() => setShowPassword(!visible)} />
                  )
                }
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                className="h-12 text-lg font-medium"
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <p className="text-xs text-gray-500 text-center mb-3">测试账号（密码均为 123456）：</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">admin</span>
                <span className="text-gray-400 ml-2">管理员</span>
              </div>
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">supervisor</span>
                <span className="text-gray-400 ml-2">运行主管</span>
              </div>
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">operator</span>
                <span className="text-gray-400 ml-2">值班人员</span>
              </div>
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">inspector</span>
                <span className="text-gray-400 ml-2">巡检员</span>
              </div>
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">maintenance</span>
                <span className="text-gray-400 ml-2">维修班组</span>
              </div>
              <div className="p-2 rounded-lg bg-dark-700/50">
                <span className="text-primary-400">electric_user</span>
                <span className="text-gray-400 ml-2">管线单位</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
