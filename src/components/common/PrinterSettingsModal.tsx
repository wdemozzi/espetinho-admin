import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Smartphone,
  Laptop,
  Layers,
  Sparkles,
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        text: 'Comanda de teste enviada para impressão!',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-charcoal-900 border border-gray-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/60">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Configurar Impressora Térmica</h2>
              <p className="text-xs text-gray-400">Bluetooth, RawBT e Impressão Automática de Comandas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
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

        <div className="mt-5 space-y-5">
          {/* 1. AUTO-PRINT TOGGLE */}
          <div className="p-4 rounded-xl bg-charcoal-850 border border-gray-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Impressão Automática</span>
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
              <p className="text-xs text-gray-400 mt-1">
                Ao receber um pedido do site ou QR Code, a comanda é enviada diretamente para a impressora.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoPrint}
              className={`w-13 h-7 rounded-full p-1 transition-colors flex items-center ${
                autoPrint ? 'bg-emerald-600 justify-end' : 'bg-gray-700 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition" />
            </button>
          </div>

          {/* 2. PRINT METHOD SELECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">
              Método de Conexão com a Impressora
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleChangePrintMethod('browser')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'browser'
                    ? 'bg-purple-950/40 border-purple-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  {printMethod === 'browser' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Navegador / PC</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Windows / Kiosk silencioso</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChangePrintMethod('bluetooth')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'bluetooth'
                    ? 'bg-blue-950/40 border-blue-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Bluetooth className="w-4 h-4 text-blue-400" />
                  {printMethod === 'bluetooth' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Bluetooth Direto</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Web Bluetooth ESC/POS</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChangePrintMethod('rawbt')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  printMethod === 'rawbt'
                    ? 'bg-emerald-950/40 border-emerald-600 text-white shadow-sm'
                    : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  {printMethod === 'rawbt' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">App RawBT</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Padrão Android celular</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. BLUETOOTH PAIRING SECTION (If Bluetooth or supported) */}
          <div className="p-4 rounded-xl bg-charcoal-850 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Status da Conexão Bluetooth</span>
              </div>
              {btConnected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  Conectada
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-700/40 text-gray-400 border border-gray-700 text-[10px] font-bold">
                  Desconectada
                </span>
              )}
            </div>

            {btConnected && btDeviceName && (
              <p className="text-xs text-gray-300">
                Dispositivo pareado: <strong className="text-blue-300">{btDeviceName}</strong>
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {!btConnected ? (
                <button
                  type="button"
                  onClick={handleConnectBluetooth}
                  disabled={isConnectingBt}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>{isConnectingBt ? 'Buscando impressora...' : 'Parear Impressora Bluetooth'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectBluetooth}
                  className="py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-bold transition"
                >
                  Desconectar
                </button>
              )}

              <button
                type="button"
                onClick={handleTestPrint}
                className="py-2 px-3 rounded-xl bg-charcoal-750 hover:bg-gray-700 text-gray-200 border border-gray-600 text-xs font-bold flex items-center gap-1.5 transition"
                title="Imprime um cupom de demonstração para testar tamanho e margem"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Testar Impressão</span>
              </button>
            </div>
          </div>

          {/* 4. PAPER WIDTH SELECTION */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">
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
                  className={`py-2 px-2.5 rounded-xl border text-center transition ${
                    paperWidth === w.id
                      ? 'bg-purple-900/40 border-purple-500 text-white font-bold'
                      : 'bg-charcoal-850 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="text-xs">{w.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{w.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. PRACTICAL GUIDE FOR THE LADIES */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200/90 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Como funciona na prática no espetinho:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-300">
              <li>
                <strong>No Celular Android com Bluetooth:</strong> Basta instalar o app gratuito <em>RawBT</em> ou conectar pelo botão azul acima no Google Chrome. Quando o cliente pedir no site, a bobina imprime na hora!
              </li>
              <li>
                <strong>No Computador / Notebook do Caixa:</strong> Pareie a impressora no Windows via Bluetooth e deixe o Chrome aberto. Com o modo quiosque (<em>--kiosk-printing</em>), o papel sai silencioso em menos de 1 segundo sem nenhuma janela.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition"
          >
            Concluir e Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
