import React, { useState, useEffect } from 'react';
import toast, { Toast } from 'react-hot-toast';
import { ShieldAlert, Clock, X } from 'lucide-react';

const BAN_STORAGE_KEY_UNTIL = 'sporting_active_ban_until';
const BAN_STORAGE_KEY_MSG = 'sporting_active_ban_message';

/**
 * Executes parse Ban Time In Seconds operation.
 */
export function parseBanTimeInSeconds(message: string): number | null {
  if (!message) return null;

  let totalSeconds = 0;
  let foundMatch = false;

  const hourMatch = message.match(/(\d+)\s*(?:hour|hours|hr|hrs|giờ|giờ)/i);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    foundMatch = true;
  }

  const minMatch = message.match(/(\d+)\s*(?:minute|minutes|min|mins|phút|phút)/i);
  if (minMatch) {
    totalSeconds += parseInt(minMatch[1], 10) * 60;
    foundMatch = true;
  }

  const secMatch = message.match(/(\d+)\s*(?:second|seconds|sec|secs|giây)/i);
  if (secMatch) {
    totalSeconds += parseInt(secMatch[1], 10);
    foundMatch = true;
  }

  return foundMatch ? totalSeconds : null;
}

/**
 * Creates or saves ActiveBanToStorage.
 */
export function saveActiveBanToStorage(message: string, seconds: number) {
  const untilTimestamp = Date.now() + seconds * 1000;
  localStorage.setItem(BAN_STORAGE_KEY_UNTIL, String(untilTimestamp));
  localStorage.setItem(BAN_STORAGE_KEY_MSG, message);
}

/**
 * Retrieves ActiveBanFromStorage information.
 */
export function getActiveBanFromStorage(): { message: string; secondsLeft: number } | null {
  const untilStr = localStorage.getItem(BAN_STORAGE_KEY_UNTIL);
  const msg = localStorage.getItem(BAN_STORAGE_KEY_MSG);

  if (!untilStr) return null;

  const untilTimestamp = Number(untilStr);
  const diffMs = untilTimestamp - Date.now();
  const secondsLeft = Math.ceil(diffMs / 1000);

  if (secondsLeft <= 0) {
    clearActiveBanStorage();
    return null;
  }

  return {
    message: msg || 'Tài khoản của bạn đang bị tạm khóa.',
    secondsLeft,
  };
}

/**
 * Executes clear Active Ban Storage operation.
 */
export function clearActiveBanStorage() {
  localStorage.removeItem(BAN_STORAGE_KEY_UNTIL);
  localStorage.removeItem(BAN_STORAGE_KEY_MSG);
}

interface BanCountdownToastProps {
  t: Toast;
  initialMessage: string;
  totalSeconds: number;
}

const BanCountdownToastContent: React.FC<BanCountdownToastProps> = ({
  t,
  initialMessage,
  totalSeconds: initialTotalSeconds,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialTotalSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      clearActiveBanStorage();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          clearActiveBanStorage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  /**
   * Handles event processing for handleClose.
   */
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.dismiss(t.id);
    setTimeout(() => {
      toast.remove(t.id);
    }, 150);
  };

  /**
   * Formats a time string or Date object into 12-hour AM/PM display format.
   */
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    if (m > 0) {
      return `${m}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${s}s`;
  };

  return (
    <div
      className={`max-w-md w-full bg-[#0F172A] text-slate-100 shadow-2xl rounded-2xl p-4 border border-rose-500/40 backdrop-blur-xl flex flex-col gap-3 font-sans relative transition-all duration-200 ease-out transform ${
        t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400 flex-shrink-0 mt-0.5 border border-rose-500/30">
          <ShieldAlert className="w-5 h-5 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
        <div className="flex-1 min-w-0 pr-6 text-left">
          <h4 className="text-xs font-extrabold text-rose-400 tracking-wider uppercase">
            Tài khoản bị tạm khóa
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
            {initialMessage}
          </p>

          <div className="mt-3 flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-rose-500/25">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-xs font-semibold text-slate-300">Đếm ngược mở khóa:</span>
            </div>
            <span className="font-mono font-black text-sm text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-lg border border-rose-500/30 tracking-wide">
              {secondsLeft > 0 ? (
                formatTime(secondsLeft)
              ) : (
                <span className="text-emerald-400 text-xs font-bold">Hết thời gian chờ!</span>
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close Toast"
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 active:scale-90 transition-all cursor-pointer z-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Executes show Smart Toast Error operation.
 */
export function showSmartToastError(message: string, fallbackId?: string): boolean {
  if (!message) return false;

  const seconds = parseBanTimeInSeconds(message);
  const isBanRelated =
    seconds !== null ||
    /ban|banned|khóa|tạm khóa|vô hiệu hóa|quá số lần|try again after/i.test(message);

  if (isBanRelated && seconds && seconds > 0) {
    saveActiveBanToStorage(message, seconds);

    toast.custom(
      (t) => (
        <BanCountdownToastContent
          t={t}
          initialMessage={message}
          totalSeconds={seconds}
        />
      ),
      {
        id: fallbackId || 'ban-countdown-toast',
        duration: (seconds + 3) * 1000,
      }
    );
    return true;
  }

  toast.error(message, { id: fallbackId || message });
  return false;
}

/**
 * Executes restore Active Ban Toast operation.
 */
export function restoreActiveBanToast(): boolean {
  const activeBan = getActiveBanFromStorage();
  if (activeBan && activeBan.secondsLeft > 0) {
    showSmartToastError(activeBan.message, 'restored-ban-toast');
    return true;
  }
  return false;
}
