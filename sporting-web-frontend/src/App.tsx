import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthUser } from '../types/auth';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';
import { tokenManager } from '../utils/tokenManager';
import { AIChatFloatingButton } from '../component/chat/AIChatFloatingButton';

// Route-level code-splitting for optimal bundle performance
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const AuthPage = lazy(() => import('../pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const UserDashboardPage = lazy(() => import('../pages/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const VendorDetailPage = lazy(() => import('../pages/VendorDetailPage').then((m) => ({ default: m.VendorDetailPage })));
const YardDetailPage = lazy(() => import('../pages/YardDetailPage').then((m) => ({ default: m.YardDetailPage })));
const CartCheckoutPage = lazy(() => import('../pages/CartCheckoutPage').then((m) => ({ default: m.CartCheckoutPage })));
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const VendorDashboardPage = lazy(() => import('../pages/VendorDashboardPage').then((m) => ({ default: m.VendorDashboardPage })));
const VerifyQrPage = lazy(() => import('../pages/VerifyQrPage').then((m) => ({ default: m.VerifyQrPage })));

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-[#F2F0EB] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
    <div className="flex items-center gap-3 bg-[#FBF8F0] px-6 py-4 rounded-2xl border border-[#E6E2D8] shadow-lg">
      <div className="w-6 h-6 border-3 border-[#006241] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-extrabold text-[#1E3932]">Đang tải trang...</span>
    </div>
  </div>
);

interface AnimatedRoutesProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentUser: AuthUser | null;
  getTargetDashboard: () => string;
  handleLogout: () => void;
  handleAuthSuccess: (user: AuthUser) => void;
}

const AnimatedRoutes: React.FC<AnimatedRoutesProps> = ({
  isAuthenticated,
  isAdmin,
  currentUser,
  getTargetDashboard,
  handleLogout,
  handleAuthSuccess,
}) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-page-transition w-full min-h-screen">
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes location={location}>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={getTargetDashboard()} replace />
            ) : (
              <HomePage currentUser={null} onLogout={handleLogout} />
            )
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated &&
              !window.location.search.includes('token=') &&
              !window.location.search.includes('isPendingVerification=') ? (
              <Navigate to={getTargetDashboard()} replace />
            ) : (
              <AuthPage defaultMode="login" onSuccess={handleAuthSuccess} />
            )
          }
        />

        <Route
          path="/add-account"
          element={<AuthPage defaultMode="login" onSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to={getTargetDashboard()} replace />
            ) : (
              <AuthPage defaultMode="register" onSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/otp"
          element={
            isAuthenticated ? (
              <Navigate to={getTargetDashboard()} replace />
            ) : (
              <AuthPage defaultMode="otp" onSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? (
              <Navigate to={getTargetDashboard()} replace />
            ) : (
              <AuthPage defaultMode="forgot" onSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route path="/forgot" element={<Navigate to="/forgot-password" replace />} />

        <Route
          path="/admin"
          element={
            isAuthenticated ? (
              isAdmin ? (
                <AdminDashboardPage currentUser={currentUser} onLogout={handleLogout} />
              ) : (
                <Navigate to={getTargetDashboard()} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/users" element={<Navigate to="/user" replace />} />
        <Route
          path="/user"
          element={
            <UserDashboardPage currentUser={currentUser} onLogout={handleLogout} />
          }
        />
        <Route
          path="/user/profile"
          element={
            isAuthenticated ? (
              <UserProfilePage currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/vendor/dashboard"
          element={
            isAuthenticated ? (
              <VendorDashboardPage currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/vendor-dashboard" element={<Navigate to="/vendor/dashboard" replace />} />
        <Route
          path="/vendor/:id"
          element={
            <VendorDetailPage currentUser={currentUser} onLogout={handleLogout} />
          }
        />
        <Route path="/user/vendor/:id" element={<Navigate to="/vendor/:id" replace />} />
        <Route
          path="/yard/:id"
          element={
            <YardDetailPage currentUser={currentUser} onLogout={handleLogout} />
          }
        />
        <Route path="/user/yard/:id" element={<Navigate to="/yard/:id" replace />} />
        <Route
          path="/cart"
          element={
            isAuthenticated ? (
              <CartCheckoutPage currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/user/cart" element={<Navigate to="/cart" replace />} />
        <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
        <Route path="/booked-yards" element={<Navigate to="/user/profile?tab=booked-yards" replace />} />
        <Route path="/user/bookings" element={<Navigate to="/user/profile?tab=booked-yards" replace />} />
        <Route path="/dashboard" element={<Navigate to="/user" replace />} />

        <Route path="/verify-qr" element={<VerifyQrPage />} />
        <Route path="/bookings/verify_qr" element={<VerifyQrPage />} />
        <Route path="/api/v1/bookings/verify_qr" element={<VerifyQrPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const isSyncingRef = useRef<boolean>(false);

  const syncUserProfile = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const activeToken = tokenManager.getActiveToken();
      if (!activeToken) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        return;
      }

      const user = await authService.fetchCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsAdmin(user.role === 'ADMIN');
        socketService.connect();
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsInitializing(false);
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    syncUserProfile();

    const handleSync = () => {
      syncUserProfile();
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'access_token') {
        syncUserProfile();
      }
    };

    window.addEventListener('sporting_account_switched', handleSync);
    window.addEventListener('sporting_accounts_changed', handleSync);
    window.addEventListener('storage', handleStorage as EventListener);
    return () => {
      window.removeEventListener('sporting_account_switched', handleSync);
      window.removeEventListener('sporting_accounts_changed', handleSync);
      window.removeEventListener('storage', handleStorage as EventListener);
    };
  }, [syncUserProfile]);

  useEffect(() => {
    if (!isAuthenticated) return;

    socketService.sendUserActiveHeartbeat();

    const interval = setInterval(() => {
      if (tokenManager.getActiveToken()) {
        socketService.sendUserActiveHeartbeat();
      }
    }, 25000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsAdmin(user.role === 'ADMIN');
    socketService.connect();
  };

  const handleLogout = () => {
    socketService.disconnect();
    tokenManager.clearTabSession();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    toast.success('Đăng xuất hệ thống thành công!', { id: 'auth-logout' });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F2F0EB] flex flex-col items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center gap-3 bg-[#FBF8F0] px-6 py-4 rounded-2xl border border-[#E6E2D8] shadow-lg">
          <div className="w-6 h-6 border-3 border-[#006241] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-extrabold text-[#1E3932]">Đang tải dữ liệu hệ thống...</span>
        </div>
      </div>
    );
  }

  const getTargetDashboard = () => {
    if (!currentUser) return '/user';
    if (currentUser.role === 'ADMIN') return '/admin';
    if (currentUser.role === 'VENDOR') return '/vendor/dashboard';
    return '/user';
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #334155',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <AnimatedRoutes
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        currentUser={currentUser}
        getTargetDashboard={getTargetDashboard}
        handleLogout={handleLogout}
        handleAuthSuccess={handleAuthSuccess}
      />
      <AIChatFloatingButton />
    </BrowserRouter>
  );
}
