import React, { useState, useEffect } from 'react';
import { Order, ProductionSector } from '../../types/database.types';
import { db } from '../../lib/databaseStore';
import { OrderCard } from '../../components/kitchen/OrderCard';
import { soundService } from '../../lib/sound';
import {
  ChefHat,
  Flame,
  Soup,
  Beer,
  Layers,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface KitchenKdsPageProps {
  initialSector?: ProductionSector | 'all';
  pageTitle?: string;
}

export const KitchenKdsPage: React.FC<KitchenKdsPageProps> = ({
  initialSector = 'all',
  pageTitle,
}) => {
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [activeSector, setActiveSector] = useState<ProductionSector | 'all'>(initialSector);
  const [activeViewMode, setActiveViewMode] = useState<'active' | 'history'>('active');

  // Keep activeSector in sync when initialSector prop changes (e.g. user navigated from header)
  useEffect(() => {
    if (initialSector) {
      setActiveSector(initialSector);
    }
  }, [initialSector]);

  useEffect(() => {
    return db.subscribe(() => {
      setOrders(db.getOrders());
    });
  }, []);

  const sectors = [
    { id: 'all', label: 'Central (Todos os Pedidos)', icon: Layers },
    { id: 'churrasqueira', label: 'Espetos', icon: Flame },
    { id: 'cozinha', label: 'Pratos & Porções', icon: Soup },
    { id: 'bar', label: 'Bebidas', icon: Beer },
  ];

  const sectorMeta: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
    churrasqueira: {
      title: pageTitle || 'Espetos na Brasa',
      subtitle: 'Fila de espetinhos e grelhados em tempo real',
      icon: Flame,
      color: 'text-orange-400',
      bg: 'bg-orange-600/20',
      border: 'border-orange-500/40',
    },
    cozinha: {
      title: pageTitle || 'Pratos & Cozinha',
      subtitle: 'Fila de pratos, porções, jantinhas e sobremesas',
      icon: ChefHat,
      color: 'text-amber-400',
      bg: 'bg-amber-600/20',
      border: 'border-amber-500/40',
    },
    bar: {
      title: pageTitle || 'Bar & Bebidas',
      subtitle: 'Fila de cervejas, chopp, copão e drinks gelados',
      icon: Beer,
      color: 'text-cyan-400',
      bg: 'bg-cyan-600/20',
      border: 'border-cyan-500/40',
    },
    all: {
      title: pageTitle || 'Fila de Preparo & Pedidos (Central)',
      subtitle: 'Todos os pedidos do site e garçom unificados em uma única fila',
      icon: Layers,
      color: 'text-purple-400',
      bg: 'bg-purple-600/20',
      border: 'border-purple-500/40',
    },
  };

  const currentMeta = sectorMeta[activeSector] || sectorMeta.all;
  const CurrentIcon = currentMeta.icon;

  // Filter orders that actually contain items for this active sector
  const relevantOrders = orders.filter((o) => {
    const sectorItems = activeSector === 'all'
      ? o.items
      : o.items.filter((i) => i.sector === activeSector);

    if (sectorItems.length === 0) return false;

    if (activeViewMode === 'active') {
      // Order is active if at least one item in this sector is pending/preparing/ready
      return sectorItems.some((i) => i.status !== 'delivered' && i.status !== 'cancelled');
    } else {
      // History: all items in this sector are delivered (or cancelled)
      return sectorItems.every((i) => i.status === 'delivered' || i.status === 'cancelled');
    }
  });

  // Calculate items pending and ready specifically for active sector
  const sectorAllItems = orders
    .flatMap((o) => o.items)
    .filter((i) => activeSector === 'all' || i.sector === activeSector);

  const pendingCount = sectorAllItems.filter(
    (i) => i.status === 'received' || i.status === 'preparing'
  ).length;

  const readyCount = sectorAllItems.filter((i) => i.status === 'ready').length;

  return (
    <div className="space-y-4">
      {/* Sleek KDS Header bar */}
      <div className="bg-charcoal-850 p-3 sm:p-5 rounded-2xl border border-gray-800 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl ${currentMeta.bg} border ${currentMeta.border} flex items-center justify-center ${currentMeta.color} flex-shrink-0`}
          >
            <CurrentIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{currentMeta.title}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-charcoal-900 text-amber-400 border border-gray-700 font-mono font-bold">
                {pendingCount} pendente(s)
              </span>
            </h1>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {readyCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold animate-pulse">
              {readyCount} pronto(s)
            </span>
          )}

          <button
            type="button"
            onClick={() => soundService.playOrderReady()}
            title="Testar sinal sonoro de pedido pronto"
            className="p-2 rounded-xl bg-charcoal-900 hover:bg-gray-700 border border-gray-700 text-amber-400 transition"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sector Filter & Queue Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Sector Tabs */}
        <div className="flex items-center gap-1.5 bg-charcoal-850 p-1.5 rounded-xl border border-gray-800 overflow-x-auto no-scrollbar">
          {sectors.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSector === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSector(sec.id as ProductionSector | 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-ember-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-charcoal-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-charcoal-850 p-1 rounded-xl border border-gray-800 self-end sm:self-auto">
          <button
            onClick={() => setActiveViewMode('active')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeViewMode === 'active'
                ? 'bg-charcoal-800 text-ember-400 shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Fila Ativa ({relevantOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveViewMode('history')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeViewMode === 'history'
                ? 'bg-charcoal-800 text-emerald-400 shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      {/* Orders Cards Grid */}
      {relevantOrders.length === 0 ? (
        <div className="h-56 rounded-2xl bg-charcoal-850/60 border border-gray-800 flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <Sparkles className="w-10 h-10 text-amber-500/50 mb-2" />
          <h3 className="text-sm font-bold text-gray-200">
            {activeViewMode === 'active'
              ? `Nenhum pedido pendente em ${currentMeta.title}`
              : 'Nenhum pedido no histórico deste setor'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            {activeSector === 'churrasqueira'
              ? 'Novos pedidos de espetinhos do garçom ou dos clientes aparecerão aqui automaticamente com bipe sonoro.'
              : activeSector === 'cozinha'
              ? 'Novos pedidos de pratos, porções e acompanhamentos aparecerão aqui automaticamente com bipe sonoro.'
              : activeSector === 'bar'
              ? 'Novos pedidos de cervejas, chopp e bebidas aparecerão aqui automaticamente com aviso sonoro.'
              : 'Novos pedidos de todos os setores aparecerão aqui automaticamente com bipe sonoro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {relevantOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              activeSectorFilter={activeSector}
            />
          ))}
        </div>
      )}
    </div>
  );
};
