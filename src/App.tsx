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
import { db } from './lib/databaseStore';
import { isAutoPrintEnabled, printOrderTicket } from './lib/thermalPrinter';
import { Printer } from 'lucide-react';

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
  const [printToast, setPrintToast] = useState<{ message: string; orderNumber: number } | null>(null);

  // Escuta novos pedidos recebidos do site ou garçom para disparar a impressão automática de comanda
  useEffect(() => {
    return db.onNewOrder((newOrder, tab) => {
      if (isAutoPrintEnabled()) {
        try {
          printOrderTicket(newOrder, tab);
          setPrintToast({
            message: `Pedido #${newOrder.order_number} enviado para a impressora!`,
            orderNumber: newOrder.order_number,
          });
          setTimeout(() => setPrintToast(null), 5000);
        } catch (err) {
          console.error('[AutoPrint] Erro ao imprimir comanda do pedido:', err);
        }
      }
    });
  }, []);

  // Parse path / query for default view (e.g. /admin, /cozinha, /caixa, /garcom)
  // and redirect customer requests (e.g. ?mesa=... or ?view=cardapio) to the public customer app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const mesa = params.get('mesa');
      const view = params.get('view') || params.get('tab');

      // 1. If scanned a table QR code on admin domain, redirect instantly to customer app
      if (mesa) {
        window.location.replace(`https://espetinho-comandas.vercel.app/?mesa=${encodeURIComponent(mesa)}`);
        return;
      }

      // 2. If opened public digital menu on admin domain, redirect to customer app
      if (view === 'cardapio' || pathname === '/cardapio' || pathname === '/menu') {
        window.location.replace('https://espetinho-comandas.vercel.app');
        return;
      }

      if (pathname.includes('admin') || view === 'admin') {
        setCurrentView('admin');
      } else if (pathname.includes('churrasqueira') || view === 'churrasqueira') {
        setCurrentView('churrasqueira');
      } else if (pathname.includes('cozinha') || view === 'cozinha') {
        setCurrentView('cozinha');
      } else if (pathname.includes('bar') || pathname.includes('bebida') || view === 'bar' || view === 'bebidas') {
        setCurrentView('bar');
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
          // Set initial view according to logged-in profile role if not already chosen by URL
          const userRole = currentUser?.role;
          if (userRole === 'churrasqueira') setCurrentView('churrasqueira');
          else if (userRole === 'cozinha') setCurrentView('cozinha');
          else if (userRole === 'bar') setCurrentView('bar');
          else if (userRole === 'caixa') setCurrentView('caixa');
          else if (userRole === 'admin') setCurrentView('admin');
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

      {/* Floating Auto-Print Notification Toast */}
      {printToast && (
        <div className="fixed top-18 right-4 z-50 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <div className="p-2 rounded-xl bg-emerald-600/30 text-emerald-300">
            <Printer className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Comanda Impressa Automaticamente!</div>
            <div className="text-[11px] text-emerald-300 font-medium">{printToast.message}</div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {currentView === 'garcom' && (
          <WaiterTablesPage onNavigateToCashier={handleNavigateToCashier} />
        )}
        {currentView === 'cardapio' && (
          <AdminDashboard initialTab="products" />
        )}
        {(currentView === 'cozinha' || currentView === 'churrasqueira' || currentView === 'bar') && (
          <KitchenKdsPage initialSector="all" pageTitle="Fila de Preparo & Pedidos (Central)" />
        )}
        {currentView === 'caixa' && <CashierTabsPage initialTabId={cashierInitialTabId} />}
        {currentView === 'admin' && <AdminDashboard initialTab="products" />}
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
