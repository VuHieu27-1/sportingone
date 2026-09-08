import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Settings,
  Trash2,
  Sparkles,
  Loader2,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AiApiKeyItem,
  AiKeyMetrics,
  aiApiKeyService,
} from '../../services/aiApiKeyService';
import { AdminAiKeyModal } from './AdminAiKeyModal';
import { ConfirmModal } from '../common/ConfirmModal';

type SubTabFilter = 'connected' | 'all' | 'cooldown';

export const AdminAiKeysTab: React.FC = () => {
  const [keys, setKeys] = useState<AiApiKeyItem[]>([]);
  const [metrics, setMetrics] = useState<AiKeyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [activeSubTab, setActiveSubTab] = useState<SubTabFilter>('connected');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<AiApiKeyItem | null>(null);

  // Delete confirm state
  const [keyToDelete, setKeyToDelete] = useState<AiApiKeyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reveal / Copy tracking
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<number, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  // Testing key state
  const [testingKeyId, setTestingKeyId] = useState<number | null>(null);
  const [latencyMap, setLatencyMap] = useState<Record<number, number>>({});

  const fetchKeys = async (showToast = false) => {
    setIsLoading(true);
    try {
      const [keysData, metricsData] = await Promise.all([
        aiApiKeyService.getAllKeys(),
        aiApiKeyService.getMetrics(),
      ]);
      setKeys(keysData);
      setMetrics(metricsData);
      if (showToast) {
        toast.success('Đã đồng bộ hóa danh sách API Key & Metrics');
      }
    } catch {
      toast.error('Không thể tải danh sách API Key');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleToggleStatus = async (keyItem: AiApiKeyItem) => {
    try {
      const updated = await aiApiKeyService.toggleKey(keyItem.id);
      toast.success(
        updated.status === 'active'
          ? `Đã kích hoạt kết nối [${keyItem.name}]`
          : `Đã tạm ngắt kết nối [${keyItem.name}]`,
      );
      fetchKeys();
    } catch {
      toast.error('Không thể thay đổi trạng thái kết nối');
    }
  };

  const handleTestKey = async (keyItem: AiApiKeyItem) => {
    setTestingKeyId(keyItem.id);
    try {
      const res = await aiApiKeyService.testKey(keyItem.apiKey, 'gemini');
      if (res.valid) {
        if (res.latencyMs) {
          setLatencyMap((prev) => ({ ...prev, [keyItem.id]: res.latencyMs! }));
        }
        toast.success(`[${keyItem.name}] Kết nối xuất sắc! Độ trễ: ${res.latencyMs}ms`);
      } else {
        toast.error(`[${keyItem.name}] Lỗi xác thực: ${res.message}`);
      }
      fetchKeys();
    } catch (err: any) {
      toast.error(`Lỗi khi kiểm tra: ${err?.message || 'Không thể kết nối'}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    setIsDeleting(true);
    try {
      await aiApiKeyService.deleteKey(keyToDelete.id);
      toast.success(`Đã gỡ bỏ API Key [${keyToDelete.name}]`);
      setKeyToDelete(null);
      fetchKeys();
    } catch {
      toast.error('Không thể gỡ bỏ API Key');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleReveal = (id: number) => {
    setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success('Đã copy mã API Key');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Filter keys according to active sub tab & search query
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      // SubTab filter
      if (activeSubTab === 'connected' && k.status !== 'active') return false;
      if (activeSubTab === 'cooldown' && k.status !== 'cooldown' && k.status !== 'error') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = k.name.toLowerCase().includes(query);
        const matchNote = (k.note || '').toLowerCase().includes(query);
        if (!matchName && !matchNote) return false;
      }

      return true;
    });
  }, [keys, activeSubTab, searchQuery]);

  const avgLatency = useMemo(() => {
    const values = Object.values(latencyMap);
    if (values.length === 0) return '0.45s';
    const sum = values.reduce((a, b) => a + b, 0);
    return `${(sum / values.length / 1000).toFixed(2)}s`;
  }, [latencyMap]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 dark:text-slate-100 pb-10">
      {/* 1. Top Enterprise Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold">Google AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Quản Lý API Key
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Quản lý danh sách API Key, cấu hình thứ tự ưu tiên xoay vòng thông minh và giám sát hiệu năng.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => {
              setEditingKey(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm API Key</span>
          </button>
        </div>
      </div>

      {/* 2. Top Sub-Navigation Tabs & Search & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 max-w-fit overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('connected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'connected'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <span>Connected</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
              {metrics?.activeKeys ?? keys.filter((k) => k.status === 'active').length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <span>All Keys</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300 font-bold">
              {metrics?.totalKeys ?? keys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('cooldown')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'cooldown'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            <span>Cooldown &amp; Errors</span>
            {(metrics?.cooldownKeys || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                {metrics?.cooldownKeys}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm API Key..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/20 shadow-2xs"
            />
          </div>

          <button
            onClick={() => fetchKeys(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
            title="Đồng bộ hóa toàn bộ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Sync All</span>
          </button>
        </div>
      </div>

      {/* 3. Five Modern SaaS Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Total Connected</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {metrics?.totalKeys ?? keys.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Connected</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {metrics?.activeKeys ?? keys.filter((k) => k.status === 'active').length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Errors / Cooldown</span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {metrics?.cooldownKeys ?? keys.filter((k) => k.status !== 'active').length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Total Requests</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {(metrics?.totalUsage ?? keys.reduce((acc, k) => acc + (k.usageCount || 0), 0)).toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Avg Latency</span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 tracking-tight">
            {avgLatency}
          </div>
        </div>
      </div>

      {/* 4. All Connected Grid Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Danh Sách API Key ({filteredKeys.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-700 dark:text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Đang tải danh sách API Key...
            </p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              Không tìm thấy API Key nào phù hợp
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bấm nút "Thêm API Key" để bổ sung API Key vào hệ thống xoay vòng.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredKeys.map((keyItem) => {
              const isRevealed = !!revealedKeyIds[keyItem.id];
              const isCopied = copiedKeyId === keyItem.id;
              const isTesting = testingKeyId === keyItem.id;
              const currentLatency = latencyMap[keyItem.id] || 420;

              return (
                <div
                  key={keyItem.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Card Top Row: Brand Icon + Title + Status Pill */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-2xs border border-indigo-200/60 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300">
                          <span>✨</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate leading-tight">
                            {keyItem.name}
                          </h4>
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            AI Model • Engine
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {keyItem.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Connected
                          </span>
                        ) : keyItem.status === 'cooldown' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-extrabold text-[11px]"
                            title={keyItem.cooldownUntil ? `Hồi phục lúc: ${new Date(keyItem.cooldownUntil).toLocaleTimeString('vi-VN')}` : ''}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-extrabold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Error
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Description & Masked Key */}
                    <div className="my-3 space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {keyItem.note || 'Multimodal AI integration for real-time court recommendation and conversation fallback.'}
                      </p>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        <span className="truncate">
                          {isRevealed
                            ? keyItem.apiKey
                            : `${keyItem.apiKey.substring(0, 6)}••••••••${keyItem.apiKey.substring(keyItem.apiKey.length - 4)}`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          <button
                            type="button"
                            onClick={() => toggleReveal(keyItem.id)}
                            className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title={isRevealed ? 'Ẩn mã key' : 'Hiện mã key'}
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(keyItem.id, keyItem.apiKey)}
                            className="p-1 hover:text-emerald-600 cursor-pointer"
                            title="Sao chép"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 3 Micro-Metrics Bar */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                      <div>
                        <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                          #{keyItem.priority}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Priority</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                          {keyItem.usageCount > 1000 ? `${(keyItem.usageCount / 1000).toFixed(1)}k` : keyItem.usageCount}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Calls</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                          {(currentLatency / 1000).toFixed(2)}s
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span>Latency</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {/* Settings / Edit */}
                      <button
                        onClick={() => {
                          setEditingKey(keyItem);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa cấu hình"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      {/* Test connection */}
                      <button
                        onClick={() => handleTestKey(keyItem)}
                        disabled={isTesting}
                        className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        title="Test kết nối"
                      >
                        {isTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setKeyToDelete(keyItem)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Xóa Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Apple / SaaS Toggle Switch */}
                    <button
                      onClick={() => handleToggleStatus(keyItem)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${keyItem.status === 'active' ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      title={keyItem.status === 'active' ? 'Bấm để tắt' : 'Bấm để kích hoạt'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${keyItem.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      <AdminAiKeyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingKey(null);
        }}
        onSuccess={fetchKeys}
        editingKey={editingKey}
      />

      {/* Delete Confirmation Modal */}
      {keyToDelete && (
        <ConfirmModal
          isOpen={!!keyToDelete}
          title="Xác nhận gỡ bỏ API Key"
          message={`Bạn có chắc chắn muốn gỡ bỏ API Key [${keyToDelete.name}] khỏi hệ thống không? Thao tác này không thể hoàn tác.`}
          confirmText="Gỡ Bỏ"
          cancelText="Hủy Bỏ"
          type="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setKeyToDelete(null)}
        />
      )}
    </div>
  );
};
