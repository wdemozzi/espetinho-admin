import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Header } from './components/common/Header';
import { WaiterTablesPage } from './pages/waiter/WaiterTablesPage';
import { KitchenKdsPage } from './pages/kitchen/KitchenKdsPage';
import { CashierTabsPage } from './pages/cashier/CashierTabsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OperatorSwitchModal } from './components/common/OperatorSwitchModal';
import { StaffLoginTerminal } from './components/common/StaffLoginTerminal';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

function AdminAppContent() {
  const { currentUser } = useAuth();
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('ct_staff_auth') === 'true';
    }
    return false;
  });
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string>('garcom');
  const [cashierInitialTabId, setCashierInitialTabId] = useState<string | undefined>(undefined);

  // Parse path / query for default view (e.g. /admin, /cozinha, /caixa, /garcom)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || params.get('tab');

      if (pathname.includes('admin') || view === 'admin') {
        setCurrentView('admin');
      } else if (pathname.includes('cozinha') || view === 'cozinha') {
        setCurrentView('cozinha');
      } else if (pathname.includes('caixa') || view === 'caixa') {
        setCurrentView('caixa');
      } else {
        setCurrentView('garcom');
      }
    }
  }, []);

  const handleNavigateToCashier = (tabId: string) => {
    setCashierInitialTabId(tabId);
    setCurrentView('caixa');
  };

  const handleLockSession = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ct_staff_auth');
    }
    setIsStaffAuthenticated(false);
  };

  // 1. Unauthenticated Gate: Pure High-Security PIN Terminal
  if (!isStaffAuthenticated) {
    return (
      <StaffLoginTerminal
        onSuccess={() => {
          setIsStaffAuthenticated(true);
        }}
        onCancel={() => {
          // In staff portal, onCancel resets PIN input and keeps screen locked
        }}
      />
    );
  }

  // 2. Authenticated Staff Operating System
  return (
    <div className="min-h-screen bg-[#0c0a17] text-gray-100 flex flex-col font-sans">
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onLockOrExit={handleLockSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {currentView === 'garcom' && (
          <WaiterTablesPage onNavigateToCashier={handleNavigateToCashier} />
        )}
        {currentView === 'cozinha' && <KitchenKdsPage />}
        {currentView === 'caixa' && <CashierTabsPage initialTabId={cashierInitialTabId} />}
        {currentView === 'admin' && <AdminDashboard />}
      </main>

      <footer className="bg-charcoal-900 border-t border-gray-800/80 py-4 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            CT Conveniência © {new Date().getFullYear()} • Painel Operacional Restrito
          </p>
          <div className="flex items-center gap-3 text-[11px] text-gray-600">
            <span>
              Operador: <strong className="text-purple-400">{currentUser.full_name} ({currentUser.role})</strong>
            </span>
            <span>•</span>
            <button
              onClick={handleLockSession}
              className="text-gray-400 hover:text-red-400 underline transition"
            >
              Bloquear Terminal
            </button>
          </div>
        </div>
      </footer>

      {isSwitchModalOpen && (
        <OperatorSwitchModal
          isOpen={true}
          onClose={() => setIsSwitchModalOpen(false)}
          onSuccess={() => setIsSwitchModalOpen(false)}
        />
      )}

      <PwaInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AdminAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
