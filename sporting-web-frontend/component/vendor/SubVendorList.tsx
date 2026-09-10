import React, { useState } from 'react';
import { Building2, MapPin, Phone, Edit, Plus, CheckCircle2, Clock, XCircle, ChevronRight, DollarSign, Layers, ChevronLeft, LayoutTemplate } from 'lucide-react';
import { BackendVendor } from '../../services/vendorService';
import { formatTimeAMPM } from '../../utils/dateUtils';

interface SubVendorListProps {
  vendors: BackendVendor[];
  vendorRevenues: Record<number, number>;
  selectedVendor: BackendVendor | null;
  onSelectVendor: (vendor: BackendVendor) => void;
  onManageYards?: (vendor: BackendVendor) => void;
  onEditVendor: (vendor: BackendVendor) => void;
  onDesignVendor?: (vendor: BackendVendor) => void;
  onAddVendor: () => void;
}

export const SubVendorList: React.FC<SubVendorListProps> = ({
  vendors,
  vendorRevenues,
  selectedVendor,
  onSelectVendor,
  onManageYards,
  onEditVendor,
  onDesignVendor,
  onAddVendor,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  const totalVendors = vendors.length;
  const totalPages = Math.ceil(totalVendors / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentVendors = vendors.slice(startIndex, endIndex);

  /**
   * Executes render Status Badge operation.
   */
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã Duyệt (Active)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-extrabold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Chờ Duyệt (Pending)
          </span>
        );
      case 'reject':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 border border-rose-500/20 text-xs font-extrabold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Bị Từ Chối (Rejected)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F0EB]">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E3932] flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#006241]" />
            Danh Sách Cụm Sân Thể Thao
          </h2>
          <p className="text-xs text-[#6F7E72] font-medium mt-1">
            Quản lý thông tin chi tiết, doanh thu từng cụm sân và chọn cụm sân để thao tác quản lý sân con.
          </p>
        </div>

        <button
          onClick={onAddVendor}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-extrabold text-xs shadow-md transition-all cursor-pointer border border-white/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng Ký Cụm Sân Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {currentVendors.map((vendor) => {
          const isSelected = selectedVendor?.id === vendor.id;
          const revenue = vendorRevenues[vendor.id] || 0;
          const formattedRev = revenue.toLocaleString('vi-VN') + 'đ';
          const yardsCount = vendor.yards?.length || 0;

          return (
            <div
              key={vendor.id}
              onClick={() => {
                if (vendor.status === 'active') {
                  if (onManageYards) {
                    onManageYards(vendor);
                  } else {
                    onSelectVendor(vendor);
                  }
                }
              }}
              className={`p-5 rounded-[24px] border transition-all flex flex-col justify-between cursor-pointer ${isSelected
                  ? 'bg-[#FBF8F0] border-[#006241] shadow-lg ring-2 ring-[#006241]/20 scale-[1.01]'
                  : 'bg-white border-[#E6E2D8] shadow-sm hover:shadow-md hover:border-[#006241]/40'
                }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#F2F0EB]">
                  <div>
                    <h3 className="font-extrabold text-[#1E3932] text-base leading-snug">
                      {vendor.vendorName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-[#6F7E72] font-semibold bg-[#F2F0EB] px-2 py-0.5 rounded-full">
                        VD-{vendor.id}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-extrabold text-[#006241] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-[#006241]/20">
                          ✓ ĐANG CHỌN
                        </span>
                      )}
                    </div>
                  </div>
                  {renderStatusBadge(vendor.status)}
                </div>

                <div className="space-y-2 text-xs text-[#1E3932] font-semibold">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#006241] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{vendor.vendorAddress || 'Chưa cập nhật địa chỉ'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#006241] shrink-0" />
                    <span className="font-mono">{vendor.vendorPhone || 'Chưa cập nhật SĐT'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#006241] shrink-0" />
                    <span className="font-mono text-[#006241] font-bold">
                      {formatTimeAMPM(vendor.openTime || '06:00')} - {formatTimeAMPM(vendor.closeTime || '23:00')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#E6E2D8]">
                    <div className="flex items-center gap-1.5 text-[#6F7E72]">
                      <Layers className="w-4 h-4 text-[#006241]" />
                      <span>Số sân:</span>
                      <strong className="text-[#1E3932] font-extrabold">{yardsCount} sân</strong>
                    </div>

                    <div className="flex items-center gap-1 text-[#006241] font-mono font-extrabold text-sm">
                      <DollarSign className="w-4 h-4" />
                      <span>{formattedRev}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F2F0EB] flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (vendor.status === 'active') {
                      if (onManageYards) {
                        onManageYards(vendor);
                      } else {
                        onSelectVendor(vendor);
                      }
                    }
                  }}
                  disabled={vendor.status !== 'active'}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full font-extrabold text-xs transition-all ${vendor.status !== 'active'
                      ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20 cursor-not-allowed opacity-80'
                      : isSelected
                        ? 'bg-[#1E3932] text-[#FBF8F0] shadow-sm cursor-pointer'
                        : 'bg-[#F2F0EB] hover:bg-[#1E3932] text-[#1E3932] hover:text-white cursor-pointer'
                    }`}
                >
                  <span>
                    {vendor.status === 'active'
                      ? `Quản Lý Sân (${yardsCount})`
                      : 'Đang Chờ Admin Duyệt'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {onDesignVendor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDesignVendor(vendor);
                    }}
                    className="p-2 rounded-full bg-[#F2F0EB] hover:bg-[#006241] text-[#006241] hover:text-white transition-all cursor-pointer"
                    title="Chỉnh sửa hình ảnh & giao diện cụm sân"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditVendor(vendor);
                  }}
                  className="p-2 rounded-full bg-[#F2F0EB] hover:bg-[#006241] text-[#1E3932] hover:text-white transition-all cursor-pointer"
                  title="Chỉnh sửa thông tin Cụm sân"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalVendors > 0 && totalPages > 1 && (
        <div className="pt-4 px-2 border-t border-[#F2F0EB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-bold text-[#6F7E72]">
            Hiển thị <span className="text-[#1E3932] font-extrabold">{startIndex + 1}</span> - <span className="text-[#1E3932] font-extrabold">{Math.min(endIndex, totalVendors)}</span> trên tổng số <span className="text-[#006241] font-extrabold">{totalVendors}</span> cụm sân
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E2D8] bg-white text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#006241]" />
              <span>Trang Trước</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${safeCurrentPage === p
                    ? 'bg-[#006241] text-[#FBF8F0] shadow-md scale-105'
                    : 'bg-white border border-[#E6E2D8] text-[#1E3932] hover:bg-[#F2F0EB]'
                  }`}
              >
                {p}
              </button>
            ))}

            <button
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E6E2D8] bg-white text-xs font-bold text-[#1E3932] hover:bg-[#F2F0EB] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
            >
              <span>Trang Sau</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#006241]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
