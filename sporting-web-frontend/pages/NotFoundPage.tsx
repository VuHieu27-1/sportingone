import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1E3932] text-[#FBF8F0] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="space-y-6 max-w-md">
        <h1 className="text-8xl font-black text-[#3FB950] font-mono tracking-widest animate-pulse">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Không tìm thấy trang yêu cầu</h2>
          <p className="text-sm text-[#FBF8F0]/70">
            Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển.
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-full bg-[#006241] hover:bg-[#3FB950] hover:text-[#1E3932] font-bold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" /> Về trang chủ
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-full border border-[#FBF8F0]/30 hover:bg-[#FBF8F0]/10 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        </div>
      </div>
    </div>
  );
};
