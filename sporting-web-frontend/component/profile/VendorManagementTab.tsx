import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Store, Plus, MapPin, Phone, Clock, AlertCircle, CheckCircle2, XCircle, RefreshCw, Building2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorService, BackendVendor } from '../../services/vendorService';
import { SubVendorModal } from '../vendor/SubVendorModal';

export const VendorManagementTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState<BackendVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('action') === 'register' ||
      params.get('action') === 'register-vendor' ||
      params.get('openRegister') === 'true'
    );
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    const action = searchParams.get('action');
    const openRegister = searchParams.get('openRegister');
    if (action === 'register' || action === 'register-vendor' || openRegister === 'true') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('openRegister');
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const action = searchParams.get('action');
    const openRegister = searchParams.get('openRegister');
    if (action === 'register' || action === 'register-vendor' || openRegister === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  /**
   * Executes load My Vendors operation.
   */
  const loadMyVendors = async () => {
    setIsLoading(true);
    try {
      const res = await vendorService.fetchMyVendors();
      if (res.success && res.data) {
        setVendors(res.data);
      }
    } catch {
      toast.error('Không thể tải danh sách cơ sở cụm sân của bạn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyVendors();
  }, []);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 text-xs font-extrabold">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
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
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E3932] flex items-center gap-2">
            <Store className="w-6 h-6 text-[#006241]" />
            Quản Lý &amp; Đăng Ký Vendor
          </h2>
          <p className="text-xs text-[#6F7E72] font-medium mt-1">
            Quản lý danh sách các cụm sân thể thao hoặc đăng ký trở thành Đối tác Vendor mới.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {vendors.length > 0 && (
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E3932] hover:bg-[#006241] text-[#FBF8F0] font-extrabold text-xs shadow-lg transition-all cursor-pointer border border-emerald-500/30"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>Vào Trang Vendor</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-extrabold text-xs shadow-lg transition-all cursor-pointer border border-white/20"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Ký Vendor Mới</span>
          </button>
        </div>
      </div>

            {isLoading ? (
        <div className="p-12 text-center rounded-[28px] bg-white border border-[#E6E2D8]">
          <RefreshCw className="w-8 h-8 text-[#006241] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#6F7E72] font-semibold">Đang tải danh sách Vendor của bạn...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="p-10 text-center rounded-[28px] bg-white border border-[#E6E2D8] shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#006241]/10 flex items-center justify-center mx-auto text-[#006241]">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-[#1E3932]">Bạn chưa đăng ký Vendor nào</h3>
            <p className="text-xs text-[#6F7E72] mt-1 leading-relaxed">
              Hãy đăng ký cơ sở kinh doanh sân thể thao của bạn ngay hôm nay để thu hút hàng ngàn người chơi đặt sân trực tuyến!
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006241] hover:bg-[#007a52] text-[#FBF8F0] font-extrabold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Ký ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-6 rounded-[28px] bg-white border border-[#E6E2D8] shadow-md hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F2F0EB]">
                  <div>
                    <h3 className="font-extrabold text-[#1E3932] text-lg leading-snug">
                      {vendor.vendorName}
                    </h3>
                    <p className="text-xs font-mono text-[#6F7E72] mt-0.5">
                      Mã Vendor: <span className="font-bold text-[#1E3932]">VD-{vendor.id}</span>
                    </p>
                  </div>
                  {renderStatusBadge(vendor.status)}
                </div>

                <div className="space-y-2.5 text-xs text-[#1E3932] font-semibold">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#006241] shrink-0 mt-0.5" />
                    <span>{vendor.vendorAddress || 'Chưa cập nhật địa chỉ'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#006241] shrink-0" />
                    <span className="font-mono">{vendor.vendorPhone || 'Chưa cập nhật SĐT'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[#6F7E72]">
                    <Building2 className="w-4 h-4 text-[#006241] shrink-0" />
                    <span>Số lượng sân quản lý: <strong className="text-[#1E3932] font-extrabold">{vendor.yards?.length || 0} sân</strong></span>
                  </div>
                </div>
              </div>

                            <div className="mt-5 pt-3 border-t border-[#F2F0EB]">
                {vendor.status === 'active' && (
                  <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vendor đang hoạt động chính thức trên hệ thống Sporting ONE.
                  </p>
                )}
                {vendor.status === 'pending' && (
                  <p className="text-[11px] text-amber-700 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Đơn đăng ký đang được Ban quản trị phê duyệt (thường từ 1-2 ngày làm việc).
                  </p>
                )}
                {vendor.status === 'reject' && (
                  <p className="text-[11px] text-red-700 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Đơn vị bị từ chối duyệt. Vui lòng liên hệ hỗ trợ để làm rõ.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

            <SubVendorModal
        isOpen={isModalOpen}
        editingVendor={null}
        onClose={handleCloseModal}
        onSuccess={() => {
          handleCloseModal();
          loadMyVendors();
        }}
      />
    </div>
  );
};
