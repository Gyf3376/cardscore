
import React from 'react';
import { UserProfile } from '../types';
import { MessageCircle, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const handleAuth = () => {
    // 模拟微信授权
    const mockUser: UserProfile = {
      id: 'u' + Math.random().toString(36).substr(2, 5),
      name: `微信用户_${Math.floor(Math.random() * 1000)}`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
    };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="mb-12 text-center space-y-4">
        <div className="w-24 h-24 bg-[#07C160] rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-green-100">
          <MessageCircle size={48} className="text-white fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">CardScore</h1>
          <p className="text-slate-400 text-sm">扑克计分专家 · 微信版</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-6">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
          <p className="text-slate-600 text-sm mb-2 font-medium">申请获取以下权限：</p>
          <p className="text-slate-400 text-xs flex items-center justify-center gap-1">
            <ShieldCheck size={12} /> 获得您的公开信息（昵称、头像等）
          </p>
        </div>

        <button
          onClick={handleAuth}
          className="w-full bg-[#07C160] hover:bg-[#06ae56] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-100 transition-all active:scale-95"
        >
          微信授权登录
        </button>
        
        <p className="text-center text-[10px] text-slate-300">
          登录即代表同意《用户协议》及《隐私政策》
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
