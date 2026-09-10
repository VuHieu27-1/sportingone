import React, { useState } from 'react';
import { Shield, Database, Sparkles, ShieldCheck } from 'lucide-react';
import { AdminBackupRestoreTab } from './AdminBackupRestoreTab';

export const AdminSettingsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'backup' | 'roles'>('backup');

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header with Sub-Tabs */}
      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#1E3932]">
              Cấu Hình Hệ Thống &amp; Dữ Liệu Admin
            </h2>
            <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
              Quản lý phân quyền người dùng và hệ thống sao lưu phục hồi dữ liệu an toàn chuẩn Production.
            </p>
          </div>

          {/* Sub Tab Navigation */}
          <div className="flex items-center p-1.5 bg-[#FBF8F0] border border-[#E6E2D8] rounded-2xl gap-1 shrink-0">
            <button
              onClick={() => setSubTab('backup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'backup'
                  ? 'bg-[#1E3932] text-[#FBF8F0] shadow-sm'
                  : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sao Lưu &amp; Phục Hồi</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-[#1E3932] font-black uppercase tracking-wider">
                Safe
              </span>
            </button>

            <button
              onClick={() => setSubTab('roles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === 'roles'
                  ? 'bg-[#1E3932] text-[#FBF8F0] shadow-sm'
                  : 'text-[#6F7E72] hover:text-[#1E3932] hover:bg-[#F2F0EB]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Phân Quyền Vai Trò</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Backup & Restore */}
      {subTab === 'backup' && <AdminBackupRestoreTab />}

      {/* Tab 2: Role Configurations */}
      {subTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2 shadow-xs">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 1</span>
            <h4 className="font-extrabold text-sm text-[#1E3932]">ADMIN (Super Administrator)</h4>
            <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
              Toàn quyền xem, thêm, sửa, xóa tất cả dữ liệu hệ thống và vận hành sao lưu, phục hồi dữ liệu.
            </p>
          </div>

          <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2 shadow-xs">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 2</span>
            <h4 className="font-extrabold text-sm text-[#1E3932]">VENDOR (Đối Tác Quản Lý Sân)</h4>
            <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
              Quyền quản lý cụm sân thi đấu cá nhân, quản lý nhân viên và duyệt đơn giữ chỗ.
            </p>
          </div>

          <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2 shadow-xs">
            <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 3</span>
            <h4 className="font-extrabold text-sm text-[#1E3932]">USER (Người Chơi Thể Thao)</h4>
            <p className="text-xs text-[#6F7E72] font-medium leading-relaxed">
              Quyền tìm kiếm cụm sân, giữ chỗ trực tuyến, nạp ví và cập nhật hồ sơ thi đấu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
