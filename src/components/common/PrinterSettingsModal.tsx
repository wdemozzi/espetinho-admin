import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Smartphone,
  Laptop,
  HelpCircle,
} from 'lucide-react';
import {
  PaperWidth,
  getStoredPaperWidth,
  setStoredPaperWidth,
  isAutoPrintEnabled,
  setAutoPrintEnabled,
  ThermalPrintMethod,
  getStoredPrintMethod,
  setStoredPrintMethod,
  isBluetoothSupported,
  isBluetoothConnected,
  getBluetoothDeviceName,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  testPrintDemo,
} from '../../lib/thermalPrinter';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const [autoPrint, setAutoPrintState] = useState<boolean>(isAutoPrintEnabled());
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(getStoredPaperWidth());
  const [printMethod, setPrintMethodState] = useState<ThermalPrintMethod>(getStoredPrintMethod());
  const [btConnected, setBtConnected] = useState<boolean>(isBluetoothConnected());
  const [btDeviceName, setBtDeviceName] = useState<string | null>(getBluetoothDeviceName());
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAutoPrintState(isAutoPrintEnabled());
      setPaperWidthState(getStoredPaperWidth());
      setPrintMethodState(getStoredPrintMethod());
      setBtConnected(isBluetoothConnected());
      setBtDeviceName(getBluetoothDeviceName());
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleToggleAutoPrint = () => {
    const next = !autoPrint;
    setAutoPrintState(next);
    setAutoPrintEnabled(next);
    setFeedbackMsg({
      text: next ? 'Impressão automática ATIVADA com sucesso!' : 'Impressão automática desativada.',
      type: 'success',
    });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleChangePaperWidth = (width: PaperWidth) => {
    setPaperWidthState(width);
    setStoredPaperWidth(width);
  };

  const handleChangePrintMethod = (method: ThermalPrintMethod) => {
    setPrintMethodState(method);
    setStoredPrintMethod(method);
  };

  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    setFeedbackMsg(null);
    try {
      const res = await connectBluetoothPrinter();
      if (res.success) {
        setBtConnected(true);
        setBtDeviceName(res.deviceName);
        setPrintMethodState('bluetooth');
        setFeedbackMsg({
          text: `Impressora "${res.deviceName}" conectada via Bluetooth!`,
          type: 'success',
        });
      } else {
        setFeedbackMsg({
          text: res.error || 'Não foi possível conectar com a impressora Bluetooth.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        text: err.message || 'Falha na conexão Bluetooth',
        type: 'error',
      });
    } finally {
      setIsConnectingBt(false);
      setTimeout(() => setFeedbackMsg(null), 4500);
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothPrinter();
    setBtConnected(false);
    setBtDeviceName(null);
    setPrintMethodState('browser');
    setFeedbackMsg({
      text: 'Impressora Bluetooth desconectada.',
      type: 'success',
    });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleTestPrint = async () => {
    setFeedbackMsg(null);
    try {
      await testPrintDemo();
      setFeedbackMsg({
        text: 'Comanda de demonstração enviada para impressão!',
        type: 'success',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({
        text: 'Erro ao imprimir comanda de teste: ' + (err.message || 'Verifique a impressora'),
        type: 'error',
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-charcoal-900 border border-gray-700/80 rounded-2xl max-w-lg w-full shadow-2xl relative my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-charcoal-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/60 flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">Configurar Impressora Térmica</h2>
              <p className="text-xs text-gray-400">Bluetooth, RawBT e Impressão de Comandas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition flex-shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Feedback Alert */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                  : 'bg-red-950/70 border border-red-700 text-red-300'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* 1. AUTO-PRINT TOGGLE */}
          <div className="p-3.5 rounded-xl bg-charcoal-850 border border-gray-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">Impressão Automática de Comandas</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    autoPrint
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-700/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  {autoPrint ? 'Ativada' : 'Pausada'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Ao receber pedidos do site, imprime a comanda na hora sem precisar clicar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoPrint}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center flex-shrink-0 ${
                autoPrint ? 'bg-emerald-600 justify-end' : 'bg-gray-700 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition" />
            </button>
          </div>

          {/* 2. PRINT METHOD SELECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              Método de Envio para a Impressora
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleChangePrintMethod('browser')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'browser'
                    ? 'bg-purple-950/40 border-purple-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Laptop className="w-3.5 h-3.5 text-purple-400" />
                  {printMethod === 'browser' && <CheckCircle2 className="w-3 h-3 text-purple-400" />}
                </div>
                <div className="text-[11px] font-bold text-white leading-tight">Navegador / PC</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Windows Kiosk</div>
              </button>

              <button
                type="button"
                onClick={() => handleChangePrintMethod('bluetooth')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'bluetooth'
                    ? 'bg-blue-950/40 border-blue-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                  {printMethod === 'bluetooth' && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                </div>
                <div className="text-[11px] font-bold text-white leading-tight">Bluetooth Direto</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Chrome ESC/POS</div>
              </button>

              <button
                type="button"
                onClick={() => handleChangePrintMethod('rawbt')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'rawbt'
                    ? 'bg-emerald-950/40 border-emerald-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  {printMethod === 'rawbt' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-bold text-white leading-tight">App RawBT</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Celular Android</div>
              </button>
            </div>
          </div>

          {/* 3. BLUETOOTH PAIRING & STATUS */}
          <div className="p-3.5 rounded-xl bg-charcoal-850 border border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Status Bluetooth</span>
              </div>
              {btConnected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  ● Conectada {btDeviceName ? `(${btDeviceName})` : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-700/40 text-gray-400 border border-gray-700 text-[10px] font-bold">
                  Desconectada
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!btConnected ? (
                <button
                  type="button"
                  onClick={handleConnectBluetooth}
                  disabled={isConnectingBt}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>{isConnectingBt ? 'Buscando...' : 'Parear Impressora Bluetooth'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectBluetooth}
                  className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-bold transition"
                >
                  Desconectar
                </button>
              )}

              <button
                type="button"
                onClick={handleTestPrint}
                className="py-2 px-3 rounded-xl bg-charcoal-750 hover:bg-gray-700 text-gray-200 border border-gray-600 text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0"
                title="Imprime um cupom de demonstração"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Testar Impressão</span>
              </button>
            </div>
          </div>

          {/* 4. PAPER WIDTH SELECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              Largura da Bobina Térmica
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '58mm', label: '58mm Padrão', sub: 'Mini POS Bluetooth' },
                { id: '58mm-wide', label: '58mm Ampla', sub: 'Sem margem lateral' },
                { id: '80mm', label: '80mm Grande', sub: 'Impressora balcão' },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleChangePaperWidth(w.id as PaperWidth)}
                  className={`py-2 px-2 rounded-xl border text-center transition ${
                    paperWidth === w.id
                      ? 'bg-purple-900/40 border-purple-500 text-white font-bold'
                      : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="text-[11px]">{w.label}</div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{w.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. PRACTICAL GUIDE */}
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/90 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span>Dicas de uso:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-gray-300">
              <li>
                <strong>Android / Celular:</strong> Use o botão azul acima no Chrome ou instale o app <em>RawBT</em> para imprimir sem tocar em nada.
              </li>
              <li>
                <strong>PC / Notebook:</strong> No Chrome com o atalho quiosque (<em>--kiosk-printing</em>), a comanda é impressa instantaneamente.
              </li>
            </ul>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-charcoal-900/95 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            className="text-xs text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>Testar agora</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition"
          >
            Concluir e Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
