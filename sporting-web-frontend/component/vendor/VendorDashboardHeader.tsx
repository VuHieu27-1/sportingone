import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft, LogOut, ShieldCheck, Building2 } from 'lucide-react';
import { AuthUser } from '../../types/auth';
import { BackendVendor } from '../../services/vendorService';
import { accountAvatarCache } from '../../services/userProfileService';
import { CustomSelect } from '../common/CustomSelect';
import { tokenManager } from '../../utils/tokenManager';

interface VendorDashboardHeaderProps {
  currentUser: AuthUser | null;
  vendors: BackendVendor[];
  selectedVendor: BackendVendor | null;
  onSelectVendor: (vendor: BackendVendor | null) => void;
  onLogout: () => void;
}

export const VendorDashboardHeader: React.FC<VendorDashboardHeaderProps> = ({
  currentUser,
  vendors,
  selectedVendor,
  onSelectVendor,
  onLogout,
}) => {
  const navigate = useNavigate();
  const displayName = currentUser?.fullName || currentUser?.username || 'Chủ Sân';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const activeAvatar =
    currentUser?.avatarUrl ||
    accountAvatarCache.getAvatar(displayName) ||
    accountAvatarCache.getAvatar(currentUser?.username || '');

  return (
    <header className="bg-[#1E3932] text-[#FBF8F0] border-b border-[#006241]/30 sticky top-0 z-40 shadow-lg font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <button
            onClick={() => navigate('/user/profile')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-extrabold text-[#FBF8F0] transition-all cursor-pointer shrink-0 border border-white/10"
            title="Quay lại Hồ sơ cá nhân"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Trang Cá Nhân</span>
          </button>

          <div className="h-6 w-[1px] bg-white/20 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-2xl bg-[#006241] flex items-center justify-center shrink-0 shadow-md border border-emerald-400/30">
              <Store className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-extrabold text-[#FBF8F0] leading-tight truncate">
                PORTAL QUẢN LÝ VENDOR
              </h1>
              <p className="text-[11px] text-[#A3B1A8] font-mono font-medium hidden sm:block truncate">
                Hệ Thống Quản Lý Cụm Sân &amp; Doanh Thu
              </p>
            </div>
          </div>
        </div>

                {vendors.length > 0 && (
          <CustomSelect
            options={[
              { value: 'all', label: `Tất cả Cụm sân (${vendors.length})` },
              ...vendors.map((v) => ({
                value: v.id,
                label: `${v.vendorName} (${v.status === 'active' ? 'Active' : v.status})`,
              })),
            ]}
            value={selectedVendor ? selectedVendor.id : 'all'}
            onChange={(val) => {
              if (String(val) === 'all') {
                onSelectVendor(null);
              } else {
                const found = vendors.find((v) => String(v.id) === String(val));
                onSelectVendor(found || null);
              }
            }}
            prefixLabel="Cụm sân:"
            icon={<Building2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            buttonClassName="rounded-full bg-black/30 border-white/20 text-[#FBF8F0] hover:bg-black/50 hover:border-emerald-400"
          />
        )}

                <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            {activeAvatar ? (
              <img src={activeAvatar} alt={displayName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#006241] flex items-center justify-center text-xs font-black text-white">
                {avatarLetter}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-extrabold text-[#FBF8F0] leading-none">
                {displayName}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>CHỦ VENDOR</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              tokenManager.handleActiveLogoutOrAutoSwitch(currentUser?.username, onLogout);
            }}
            className="p-2 rounded-full text-[#A3B1A8] hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
