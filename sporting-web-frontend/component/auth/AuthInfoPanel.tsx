import React from 'react';

export const AuthInfoPanel: React.FC = () => {
  return (
    <div className="hidden lg:flex flex-col justify-between py-6 px-4 space-y-8 min-h-[460px] text-left">
      <div className="space-y-6">
                <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#006241] border border-emerald-400/40 text-white flex items-center justify-center font-black text-xl shadow-lg">
            S
          </div>
          <div>
            <div className="font-black text-xl tracking-wider text-white">
              SPORTING <span className="text-[#3FB950]">ONE</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
              [ SPORTING ONE ECOSYSTEM ]
            </div>
          </div>
        </div>

                <div className="space-y-3 pt-2">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight uppercase">
            EXPLORE HORIZONS
          </h1>
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">
            Where Your Dream Destinations &amp; Matches Become Reality.
          </h2>
        </div>
      </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-slate-300 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span>Xác thực OTP 2FA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          <span>Bảo mật 256-bit SSL</span>
        </div>
      </div>
    </div>
  );
};
