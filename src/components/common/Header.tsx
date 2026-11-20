import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Flame,
  UtensilsCrossed,
  ChefHat,
  Beer,
  Receipt,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Volume2,
  Lock,
  LogOut,
  BellRing,
  Copy,
  Check,
  Package,
  Printer,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { soundService } from '../../lib/sound';
import { db } from '../../lib/databaseStore';
import { isAutoPrintEnabled } from '../../lib/thermalPrinter';
import { OperatorSwitchModal } from './OperatorSwitchModal';
import { ExpeditionModal } from './ExpeditionModal';
import { PrinterSettingsModal } from './PrinterSettingsModal';
import { getPublicCustomerUrl } from '../../lib/subdomain';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLockOrExit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onLockOrExit }) => {
  const { currentUser } = useAuth();
  const [time, setTime] = useState<string>('');
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);
  const [isExpeditionOpen, setIsExpeditionOpen] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [readyCount, setReadyCount] = useState<number>(() => db.getReadyOrders().length);
  const [pendingRestrictedView, setPendingRestrictedView] = useState<string | null>(null);
  const [copiedBioToast, setCopiedBioToast] = useState<boolean>(false);
  const [autoPrintActive, setAutoPrintActive] = useState<boolean>(isAutoPrintEnabled());

  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return db.subscribe(() => {
      setReadyCount(db.getReadyOrders().length);
      setAutoPrintActive(isAutoPrintEnabled());
    });
  }, []);

  // Close "Mais" dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3 Primary Focused Views requested by client: Mesas, Cardápio, Fechar Comanda
  const primaryNavItems = [
    { id: 'garcom', label: 'Mesas', icon: UtensilsCrossed },
    { id: 'cardapio', label: 'Cardápio', icon: Package },
    { id: 'caixa', label: 'Fechar Comanda', icon: Receipt },
  ];

  // Secondary tools tucked into "Mais Opções" dropdown so screen stays clean
  const secondaryNavItems = [
    { id: 'cozinha', label: 'Fila de Preparo & Pedidos (Central)', icon: ChefHat, role: 'garcom' },
    { id: 'admin', label: 'Painel & Relatórios', icon: ShieldCheck, role: 'admin' },
  ];

  const handleNavClick = (viewId: string) => {
    setIsMoreMenuOpen(false);
    if (viewId === 'admin' && currentUser.role !== 'admin') {
      setPendingRestrictedView(viewId);
      setIsSwitchModalOpen(true);
      return;
    }
    if (viewId === 'caixa' && currentUser.role !== 'admin' && currentUser.role !== 'caixa') {
      setPendingRestrictedView(viewId);
      setIsSwitchModalOpen(true);
      return;
    }
    onNavigate(viewId);
  };

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentView);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-950/80 text-purple-300 border-purple-700 hover:border-purple-500';
      case 'caixa': return 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:border-emerald-500';
      case 'churrasqueira': return 'bg-orange-950/80 text-orange-300 border-orange-700 hover:border-orange-500';
      case 'cozinha': return 'bg-amber-950/80 text-amber-300 border-amber-700 hover:border-amber-500';
      case 'bar': return 'bg-cyan-950/80 text-cyan-300 border-cyan-700 hover:border-cyan-500';
      default: return 'bg-ember-950/80 text-ember-300 border-ember-700 hover:border-ember-500';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-charcoal-900/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand with CT Conveniência Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer flex-shrink-0 group"
            onClick={() => onNavigate('garcom')}
          >
            <div className="relative">
              <img
                src="/ct-logo.png"
                alt="CT Conveniência"
                className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-purple-600/40 border border-purple-500/40 bg-charcoal-950 p-0.5 flex-shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-charcoal-900" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent whitespace-nowrap block">
                CT Conveniência
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="text-gray-400 font-medium">Gestão & Comandas</span>
                <span>•</span>
                <span className="font-mono text-purple-300 font-semibold">{time}</span>
              </div>
            </div>
          </div>

          {/* SIMPLIFIED FOCUSED NAVIGATION (Desktop: 3 Main Choices + Discreet Dropdown) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-charcoal-850 p-1.5 rounded-xl border border-gray-800 flex-shrink-0">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isLocked =
                item.id === 'caixa' && currentUser.role !== 'admin' && currentUser.role !== 'caixa';

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all shadow-sm ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-purple-600/30 ring-1 ring-purple-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isLocked && <Lock className="w-3 h-3 text-gray-500 ml-0.5 flex-shrink-0" />}
                </button>
              );
            })}

            {/* "Mais Opções" Discreet Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isSecondaryActive || isMoreMenuOpen
                    ? 'bg-charcoal-750 text-purple-300 border border-purple-800/60'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
                title="Cozinha KDS, Churrasqueira, Bar e Relatórios Avançados"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Mais</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-charcoal-900 border border-gray-700 shadow-2xl py-2 z-50 animate-fade-in">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Produção & Cozinha
                  </div>
                  <button
                    onClick={() => handleNavClick('cozinha')}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left transition ${
                      currentView === 'cozinha' || currentView === 'churrasqueira' || currentView === 'bar'
                        ? 'bg-purple-950/60 text-purple-300 border-l-2 border-purple-500'
                        : 'text-gray-300 hover:bg-charcoal-800 hover:text-white'
                    }`}
                  >
                    <ChefHat className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-white">Fila de Preparo (Central)</div>
                      <div className="text-[10px] text-gray-400">Todos os pedidos unificados</div>
                    </div>
                  </button>

                  <div className="border-t border-gray-800 my-1.5"></div>
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Administração Avançada
                  </div>
                  <button
                    onClick={() => handleNavClick('admin')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-left transition ${
                      currentView === 'admin'
                        ? 'bg-purple-950/60 text-purple-300 border-l-2 border-purple-500'
                        : 'text-gray-300 hover:bg-charcoal-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>Painel & Relatórios</span>
                    </div>
                    {currentUser.role !== 'admin' && <Lock className="w-3 h-3 text-gray-500" />}
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Quick Actions, Bluetooth Thermal Printer & Operator Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* EXPEDITION READY ALERT BUTTON */}
            {readyCount > 0 && (
              <button
                type="button"
                onClick={() => setIsExpeditionOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/40 border border-emerald-400 animate-pulse transition transform hover:scale-105"
                title="Clique para ver os pedidos prontos para entrega"
              >
                <BellRing className="w-3.5 h-3.5 animate-bounce" />
                <span>{readyCount} Pronto{readyCount > 1 ? 's' : ''}!</span>
              </button>
            )}

            {/* QUICK THERMAL / BLUETOOTH PRINTER BUTTON */}
            <button
              type="button"
              onClick={() => setIsPrinterModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                autoPrintActive
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/80 shadow-emerald-900/30'
                  : 'bg-charcoal-800 hover:bg-charcoal-700 text-gray-400 border-gray-700'
              }`}
              title="Configurar Impressora Bluetooth e Impressão Automática de Comandas"
            >
              <div className="relative">
                <Printer className="w-4 h-4 text-purple-300" />
                {autoPrintActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="hidden lg:inline text-[11px]">
                {autoPrintActive ? 'Auto-Print On' : 'Impressora'}
              </span>
            </button>

            {/* Audio test button */}
            <button
              onClick={() => soundService.playOrderReady()}
              title="Testar sinal sonoro de pedido pronto"
              className="p-2 rounded-xl bg-charcoal-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            >
              <Volume2 className="w-4 h-4 text-ember-400" />
            </button>

            {/* Public Catalog Link (Cardápio Bio) */}
            <div className="hidden xl:flex items-center">
              <button
                type="button"
                onClick={() => window.open(getPublicCustomerUrl(), '_blank')}
                title="Abrir Cardápio Digital em Nova Aba (Visualização do Cliente)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 text-xs font-semibold whitespace-nowrap transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Cardápio Bio</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = getPublicCustomerUrl();
                  navigator.clipboard.writeText(url);
                  setCopiedBioToast(true);
                  setTimeout(() => setCopiedBioToast(false), 2500);
                }}
                title="Copiar Link do Cardápio para Bio do Instagram ou WhatsApp"
                className="px-2 py-1.5 rounded-r-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border-y border-r border-purple-800/60 text-xs font-bold transition flex items-center justify-center"
              >
                {copiedBioToast ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                )}
              </button>
            </div>

            {/* PROTECTED OPERATOR BADGE (PIN locked, clean badge) */}
            <button
              type="button"
              onClick={() => setIsSwitchModalOpen(true)}
              className={`py-1.5 px-3 rounded-xl border flex items-center gap-2 transition shadow-sm ${getRoleBadgeColor(
                currentUser.role
              )}`}
              title="Clique para trocar operador ou desbloquear com PIN"
            >
              <div className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-tight truncate max-w-[110px]">
                  {currentUser.full_name.split(' ')[0]}
                </p>
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                  {currentUser.role}
                </p>
              </div>
            </button>

            {/* Exit/Lock to Public Site */}
            {onLockOrExit && (
              <button
                type="button"
                onClick={onLockOrExit}
                title="Bloquear e voltar ao site público da CT Conveniência"
                className="p-2 rounded-xl bg-charcoal-800 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-gray-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar: Clean 3 Pillars + Printer + More */}
      <div className="flex md:hidden items-center justify-around bg-charcoal-850 border-t border-gray-800 px-2 py-2">
        <button
          onClick={() => handleNavClick('garcom')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
            currentView === 'garcom' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Mesas</span>
        </button>

        <button
          onClick={() => handleNavClick('cardapio')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
            currentView === 'cardapio' || currentView === 'admin' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Cardápio</span>
        </button>

        <button
          onClick={() => handleNavClick('caixa')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
            currentView === 'caixa' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Fechar Comanda</span>
        </button>

        <button
          onClick={() => setIsPrinterModalOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
            autoPrintActive ? 'text-emerald-400' : 'text-gray-400'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Impressora</span>
        </button>

        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition ${
            isSecondaryActive ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Mais</span>
        </button>
      </div>

      {/* Mobile "Mais Opções" Sheet Modal */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 flex flex-col justify-end animate-fade-in">
          <div className="bg-charcoal-900 border-t border-gray-700 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="font-extrabold text-sm text-white">Outros Módulos Operacionais</span>
              <button onClick={() => setIsMoreMenuOpen(false)} className="text-gray-400 p-1">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="py-2 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-500 py-1">Produção & Cozinha</div>
              <button
                onClick={() => handleNavClick('cozinha')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-charcoal-850 text-gray-200 text-xs font-bold text-left hover:bg-gray-800"
              >
                <ChefHat className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <div className="text-white font-bold">Fila de Preparo & Pedidos (Central)</div>
                  <div className="text-[10px] text-gray-400">Todos os pedidos unificados</div>
                </div>
              </button>
              <div className="text-[10px] uppercase font-bold text-gray-500 py-1 pt-2">Administração Completa</div>
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-charcoal-850 text-gray-200 text-xs font-bold text-left hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Painel & Relatórios</span>
                </div>
                {currentUser.role !== 'admin' && <Lock className="w-3.5 h-3.5 text-gray-500" />}
              </button>
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  window.open(getPublicCustomerUrl(), '_blank');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 text-purple-300 text-xs font-bold text-left border border-purple-800/40 mt-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Ver Cardápio Público</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Authentication & Operator Switcher Modal */}
      {isSwitchModalOpen && (
        <OperatorSwitchModal
          isOpen={true}
          requiredRoleForAccess={pendingRestrictedView || undefined}
          onClose={() => {
            setIsSwitchModalOpen(false);
            setPendingRestrictedView(null);
          }}
          onSuccess={() => {
            if (pendingRestrictedView) {
              onNavigate(pendingRestrictedView);
              setPendingRestrictedView(null);
            }
          }}
        />
      )}

      {/* Expedition Ready Orders Modal */}
      <ExpeditionModal
        isOpen={isExpeditionOpen}
        onClose={() => setIsExpeditionOpen(false)}
      />

      {/* Thermal & Bluetooth Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => {
          setIsPrinterModalOpen(false);
          setAutoPrintActive(isAutoPrintEnabled());
        }}
      />
    </header>
  );
};
