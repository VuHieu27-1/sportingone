import React from 'react';

export const AdminSettingsTab: React.FC = () => {
  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-xs">
        <h2 className="text-lg font-extrabold text-[#1E3932]">Cấu Hình Phân Quyền &amp; Hệ Thống Admin</h2>
        <p className="text-xs text-[#6F7E72] font-medium mt-0.5">
          Cấu hình các cấp độ quyền hạn người dùng theo chuẩn Backend NestJS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2">
          <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 1</span>
          <h4 className="font-extrabold text-sm text-[#1E3932]">ADMIN (Super Administrator)</h4>
          <p className="text-xs text-[#6F7E72] font-medium">Toàn quyền xem, thêm, sửa, xóa tất cả dữ liệu hệ thống.</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2">
          <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 2</span>
          <h4 className="font-extrabold text-sm text-[#1E3932]">VENDOR (Đối Tác Quản Lý Sân)</h4>
          <p className="text-xs text-[#6F7E72] font-medium">Quyền quản lý cụm sân thi đấu cá nhân và duyệt đơn giữ chỗ.</p>
        </div>

        <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] space-y-2">
          <span className="text-[11px] font-bold text-[#6F7E72] uppercase tracking-wider">Role ID 3</span>
          <h4 className="font-extrabold text-sm text-[#1E3932]">USER (Người Chơi Thể Thao)</h4>
          <p className="text-xs text-[#6F7E72] font-medium">Quyền tìm kiếm cụm sân, giữ chỗ trực tuyến và cập nhật hồ sơ.</p>
        </div>
      </div>
    </div>
  );
};
