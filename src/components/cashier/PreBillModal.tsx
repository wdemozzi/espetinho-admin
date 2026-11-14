import React, { useState } from 'react';
import { Tab, Establishment } from '../../types/database.types';
import { formatBRL } from '../../lib/currency';
import {
  Printer,
  Share2,
  X,
  Receipt,
  CheckCircle2,
  Copy,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  PaperWidth,
  getStoredPaperWidth,
  setStoredPaperWidth,
  printThermalReceipt,
  formatReceiptAsPlainText,
  ThermalReceiptItem,
} from '../../lib/thermalPrinter';

interface PreBillModalProps {
  tab: Tab;
  establishment: Establishment;
  onClose: () => void;
}

export const PreBillModal: React.FC<PreBillModalProps> = ({ tab, establishment, onClose }) => {
  const [includeServiceFee, setIncludeServiceFee] = useState<boolean>(establishment.service_fee_enabled === true);
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(getStoredPaperWidth());
  const [copiedText, setCopiedText] = useState(false);

  const handleSelectPaperWidth = (width: PaperWidth) => {
    setPaperWidthState(width);
    setStoredPaperWidth(width);
  };

  // Group items across all tab orders including addon variations
  const itemsMap = new Map<
    string,
    ThermalReceiptItem
  >();

  const orders = tab.orders || [];
  for (const order of orders) {
    for (const item of order.items) {
      if (item.status === 'cancelled') continue;
      const addonsList = (item.addons_snapshot || []).map((a) => a.name);
      const addonsKey = [...addonsList].sort().join('|');
      const key = `${item.product_name}-${item.unit_price_cents}-${addonsKey}`;

      const existing = itemsMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total_cents += item.total_cents;
        if (item.notes && !existing.notes?.includes(item.notes)) {
          existing.notes = existing.notes ? [...existing.notes, item.notes] : [item.notes];
        }
      } else {
        itemsMap.set(key, {
          name: item.product_name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.total_cents,
          addons: addonsList.length > 0 ? addonsList : undefined,
          notes: item.notes ? [item.notes] : undefined,
        });
      }
    }
  }

  const groupedItems = Array.from(itemsMap.values());
  const subtotalCents = tab.total_cents;
  const servicePercent = establishment.service_fee_percent || 10;
  const serviceFeeCents = includeServiceFee ? Math.round((subtotalCents * servicePercent) / 100) : 0;
  const finalTotalCents = Math.max(0, subtotalCents + serviceFeeCents - tab.discount_cents);
  const remainingDueCents = Math.max(0, finalTotalCents - tab.paid_cents);

  const receiptData = {
    establishmentName: establishment.name,
    establishmentDescription: establishment.description || undefined,
    establishmentPhone: establishment.phone || undefined,
    establishmentAddress: establishment.address || undefined,
    tableName: tab.table ? tab.table.label : 'Balcão',
    customerName: tab.customer_name || undefined,
    tabCode: tab.id,
    dateTime: new Date(),
    items: groupedItems,
    subtotalCents,
    serviceFeeCents,
    serviceFeePercent: servicePercent,
    discountCents: tab.discount_cents,
    finalTotalCents,
    paidCents: tab.paid_cents,
    remainingDueCents,
    paperWidth,
    footerMessage: 'Agradecemos a preferência! 🍻',
  };

  // Impressão direta formatada para impressoras térmicas (58mm MP58C7 / 80mm)
  const handlePrint = () => {
    printThermalReceipt(receiptData);
  };

  // Copia o texto puro monoespaçado
  const handleCopyText = () => {
    const text = formatReceiptAsPlainText(receiptData);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Enviar conferência via WhatsApp
  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(formatReceiptAsPlainText(receiptData));
    const phone = tab.customer_phone?.replace(/\D/g, '') || '';
    const url = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto no-print">
      <div className="bg-charcoal-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header do Modal */}
        <div className="p-4 bg-charcoal-850 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ember-600/20 border border-ember-500/40 flex items-center justify-center text-ember-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">Conferência de Conta</h3>
              <p className="text-[11px] text-gray-400">
                {tab.table ? tab.table.label : 'Comanda Balcão'} • #{tab.id.slice(-6)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-charcoal-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ajuste de Bobina / Largura */}
        <div className="px-4 py-2.5 bg-charcoal-950 border-b border-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Formato da Bobina:</span>
          </div>
          <div className="inline-flex rounded-lg bg-charcoal-800 p-0.5 border border-gray-700">
            <button
              type="button"
              onClick={() => handleSelectPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                paperWidth === '58mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>58mm (MP58C7 / Mini)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                paperWidth === '80mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>80mm (Padrão)</span>
            </button>
          </div>
        </div>

        {/* Dica para Impressoras Térmicas */}
        <div className="px-4 py-2 bg-amber-950/30 border-b border-amber-900/40 text-[11px] text-amber-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Otimizado para {paperWidth}:</strong> Imprime com texto 100% legível, sem bordas escuras e sem margens cortadas.
          </span>
        </div>

        {/* Visualização Real do Cupom Térmico */}
        <div className="p-3 sm:p-5 overflow-y-auto max-h-[55vh] bg-charcoal-950/70 flex justify-center">
          <div
            id="thermal-receipt-printable"
            className="bg-white text-black p-3.5 rounded-lg shadow-xl font-mono text-xs space-y-2 border border-gray-300 transition-all select-all"
            style={{
              width: paperWidth === '58mm' ? '300px' : '380px',
              maxWidth: '100%',
              fontSize: paperWidth === '58mm' ? '11px' : '12px',
              lineHeight: '1.25',
            }}
          >
            {/* Cabeçalho */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="font-black text-sm uppercase tracking-wider">{establishment.name}</h2>
              {establishment.description && (
                <p className="text-[10px] text-gray-700 leading-tight mt-0.5">{establishment.description}</p>
              )}
              {establishment.phone && (
                <p className="text-[10.5px] font-bold text-gray-900 mt-0.5">Tel: {establishment.phone}</p>
              )}
              <div className="mt-1 pt-1 border-t border-dotted border-gray-400 text-[10px] text-gray-600 flex items-center justify-between">
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Metadados Comanda */}
            <div className="flex justify-between text-[11px] font-bold pb-1 border-b border-dotted border-black">
              <span>{tab.table ? tab.table.label : 'Balcão'}</span>
              <span>{tab.customer_name ? `Cli: ${tab.customer_name}` : 'Consumo Local'}</span>
            </div>
            <div className="text-[9.5px] text-gray-600">
              Comanda: #{tab.id.slice(-6)}
            </div>

            {/* Tabela de Itens */}
            <div className="py-1">
              <div className="flex justify-between font-black text-[9.5px] uppercase border-b border-black pb-1 mb-1.5">
                <span>Item</span>
                <span>Total</span>
              </div>
              <div className="space-y-1.5">
                {groupedItems.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-xs items-start gap-1">
                      <span className="font-bold flex-1 break-words leading-tight">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-bold flex-shrink-0 whitespace-nowrap">
                        {formatBRL(it.total_cents)}
                      </span>
                    </div>
                    {it.addons && it.addons.length > 0 && (
                      <div className="text-[9.5px] text-gray-700 pl-2 space-y-0.5">
                        {it.addons.map((ad, aIdx) => (
                          <div key={aIdx}>+ {ad}</div>
                        ))}
                      </div>
                    )}
                    {it.notes && it.notes.length > 0 && (
                      <div className="text-[9px] text-gray-600 italic pl-2">
                        {it.notes.map((n, nIdx) => (
                          <div key={nIdx}>Obs: {n}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Subtotais e Totais */}
            <div className="pt-2 border-t border-dashed border-black space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal Consumo:</span>
                <span className="font-bold">{formatBRL(subtotalCents)}</span>
              </div>

              {includeServiceFee && serviceFeeCents > 0 && (
                <div className="flex justify-between text-gray-800">
                  <span>Taxa de Serviço ({servicePercent}%):</span>
                  <span className="font-bold">+{formatBRL(serviceFeeCents)}</span>
                </div>
              )}

              {tab.discount_cents > 0 && (
                <div className="flex justify-between">
                  <span>Desconto:</span>
                  <span className="font-bold">-{formatBRL(tab.discount_cents)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1.5 border-t-2 border-b-2 border-black my-1 py-0.5">
                <span>TOTAL A PAGAR:</span>
                <span>{formatBRL(finalTotalCents)}</span>
              </div>

              {tab.paid_cents > 0 && (
                <div className="flex justify-between text-gray-600 text-[10px]">
                  <span>Valor Já Pago:</span>
                  <span>{formatBRL(tab.paid_cents)}</span>
                </div>
              )}

              {remainingDueCents > 0 && (
                <div className="flex justify-between font-black text-xs text-gray-900">
                  <span>SALDO RESTANTE:</span>
                  <span>{formatBRL(remainingDueCents)}</span>
                </div>
              )}
            </div>

            {/* Rodapé Fiscal */}
            <div className="text-center pt-2 border-t border-dashed border-black text-[9.5px] text-gray-600 uppercase leading-tight">
              <div className="font-bold">*** DOCUMENTO DE CONFERÊNCIA ***</div>
              <div>NÃO É DOCUMENTO FISCAL</div>
              <div className="mt-1 font-bold text-black">Agradecemos a preferência! 🍻</div>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-3.5 bg-charcoal-850 border-t border-gray-800 space-y-2.5">
          {/* Toggle de Taxa de Serviço */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-charcoal-900 border border-gray-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
              <input
                type="checkbox"
                checked={includeServiceFee}
                onChange={(e) => setIncludeServiceFee(e.target.checked)}
                className="rounded bg-charcoal-800 border-gray-700 text-ember-600 focus:ring-0"
              />
              <span>Incluir Taxa de Serviço ({servicePercent}%)</span>
            </label>
            <span className="font-mono font-bold text-gray-400">
              {includeServiceFee ? formatBRL(serviceFeeCents) : 'R$ 0,00'}
            </span>
          </div>

          {/* Grade de Botões */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-600/20 active:scale-95 border border-amber-500"
              title={`Imprimir cupom formatado para impressora térmica ${paperWidth}`}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom ({paperWidth})</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl bg-charcoal-800 hover:bg-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-gray-700 active:scale-95"
            >
              {copiedText ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-400" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
