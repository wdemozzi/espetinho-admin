import { formatBRL } from './currency';
import { Order, Tab } from '../types/database.types';

export type PaperWidth = '58mm' | '58mm-wide' | '80mm';

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  addons?: string[];
  notes?: string[];
}

export interface ThermalReceiptData {
  establishmentName: string;
  establishmentDescription?: string;
  establishmentPhone?: string;
  establishmentAddress?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  tabCode?: string;
  dateTime?: Date | string;
  items: ThermalReceiptItem[];
  subtotalCents: number;
  serviceFeeCents?: number;
  serviceFeePercent?: number;
  discountCents?: number;
  finalTotalCents: number;
  paidCents?: number;
  remainingDueCents?: number;
  paperWidth?: PaperWidth;
  footerMessage?: string;
}

const STORAGE_KEY_PAPER_WIDTH = 'ct_thermal_paper_width';

export function getStoredPaperWidth(): PaperWidth {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PAPER_WIDTH);
    if (saved === '80mm' || saved === '58mm-wide' || saved === '58mm') return saved as PaperWidth;
  } catch {
    // fallback
  }
  return '58mm';
}

export function setStoredPaperWidth(width: PaperWidth): void {
  try {
    localStorage.setItem(STORAGE_KEY_PAPER_WIDTH, width);
  } catch {
    // fallback
  }
}

/**
 * Formata cupom em texto puro monoespaçado (ideal para WhatsApp, Bluetooth RAW ou visualização)
 */
export function formatReceiptAsPlainText(data: ThermalReceiptData): string {
  const widthMode = data.paperWidth || getStoredPaperWidth();
  const cols = widthMode === '80mm' ? 42 : (widthMode === '58mm-wide' ? 32 : 30);
  const divider = '-'.repeat(cols);
  const doubleDivider = '='.repeat(cols);

  const padBoth = (str: string, width: number) => {
    const s = str.slice(0, width);
    const pad = Math.max(0, width - s.length);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + s + ' '.repeat(right);
  };

  const padRow = (left: string, right: string, width: number) => {
    const maxLeft = width - right.length - 1;
    const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
    const spaces = Math.max(1, width - l.length - right.length);
    return l + ' '.repeat(spaces) + right;
  };

  const lines: string[] = [];

  // Cabeçalho
  lines.push(padBoth(data.establishmentName.toUpperCase(), cols));
  if (data.establishmentDescription) lines.push(padBoth(data.establishmentDescription, cols));
  if (data.establishmentPhone) lines.push(padBoth(`Tel: ${data.establishmentPhone}`, cols));
  if (data.establishmentAddress) lines.push(padBoth(data.establishmentAddress, cols));

  const dt = data.dateTime ? new Date(data.dateTime) : new Date();
  const dateStr = dt.toLocaleDateString('pt-BR');
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  lines.push(padRow(dateStr, timeStr, cols));
  lines.push(divider);

  // Metadados da Comanda / Mesa e Cliente Vinculado
  const tableOrBalcao = data.tableName || 'Balcão';
  lines.push(tableOrBalcao);
  let comandaLine = data.tabCode ? `Comanda: #${data.tabCode.slice(-6)}` : 'Comanda';
  if (data.customerName) {
    comandaLine += ` - ${data.customerName}`;
  }
  if (data.customerPhone) {
    comandaLine += ` • Tel: ${data.customerPhone}`;
  }
  lines.push(comandaLine);
  lines.push(doubleDivider);

  // Itens
  lines.push(padRow('ITEM', 'TOTAL', cols));
  lines.push(divider);

  data.items.forEach((it) => {
    const itemHeader = `${it.quantity}x ${it.name}`;
    const priceStr = formatBRL(it.total_cents);
    lines.push(padRow(itemHeader, priceStr, cols));

    if (it.addons && it.addons.length > 0) {
      it.addons.forEach((ad) => {
        lines.push(`  + ${ad}`);
      });
    }

    if (it.notes && it.notes.length > 0) {
      it.notes.forEach((n) => {
        if (n.trim()) lines.push(`  Obs: ${n.trim()}`);
      });
    }
  });

  lines.push(divider);

  // Subtotais e Totais
  lines.push(padRow('Subtotal Consumo:', formatBRL(data.subtotalCents), cols));

  if (data.serviceFeeCents && data.serviceFeeCents > 0) {
    const feePct = data.serviceFeePercent ? ` (${data.serviceFeePercent}%)` : '';
    lines.push(padRow(`Taxa Servico${feePct}:`, `+${formatBRL(data.serviceFeeCents)}`, cols));
  }

  if (data.discountCents && data.discountCents > 0) {
    lines.push(padRow('Desconto:', `-${formatBRL(data.discountCents)}`, cols));
  }

  lines.push(doubleDivider);
  lines.push(padRow('TOTAL A PAGAR:', formatBRL(data.finalTotalCents), cols));

  if (data.paidCents && data.paidCents > 0) {
    lines.push(padRow('Valor Ja Pago:', formatBRL(data.paidCents), cols));
  }
  if (data.remainingDueCents !== undefined && data.remainingDueCents > 0) {
    lines.push(padRow('SALDO RESTANTE:', formatBRL(data.remainingDueCents), cols));
  }

  lines.push(doubleDivider);
  lines.push(padBoth('*** DOCUMENTO DE CONFERENCIA ***', cols));
  lines.push(padBoth('NAO E DOCUMENTO FISCAL', cols));
  lines.push(divider);
  lines.push(padBoth(data.footerMessage || 'OBRIGADO PELA PREFERENCIA! 🍻', cols));

  return lines.join('\n');
}

/**
 * Constrói o HTML puro para impressão na impressora térmica
 * Largura calibrada milimetricamente para evitar cortes na margem direita de mini impressoras 58mm como a MP58C7
 */
export function buildThermalReceiptHtml(data: ThermalReceiptData): string {
  const widthMode = data.paperWidth || getStoredPaperWidth();
  
  // 58mm (MP58C7): 42mm de área de impressão + 2.5mm de margem de segurança à direita
  // 58mm-wide: 46mm de área de impressão
  // 80mm: 70mm de área de impressão
  const printableWidthMm = widthMode === '80mm' ? '70mm' : (widthMode === '58mm-wide' ? '46mm' : '42mm');
  const fontSizePx = widthMode === '80mm' ? '12px' : (widthMode === '58mm-wide' ? '10.5px' : '10px');
  const rightPaddingMm = widthMode === '80mm' ? '2mm' : (widthMode === '58mm-wide' ? '1.5mm' : '2.5mm');

  const dt = data.dateTime ? new Date(data.dateTime) : new Date();
  const dateStr = dt.toLocaleDateString('pt-BR');
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = data.items
    .map((it) => {
      const addonsHtml =
        it.addons && it.addons.length > 0
          ? it.addons
              .map(
                (ad) =>
                  `<div style="font-size: 8.5px; color: #222; padding-left: 6px; line-height: 1.15; margin-top: 1px;">+ ${escapeHtml(ad)}</div>`
              )
              .join('')
          : '';

      const notesHtml =
        it.notes && it.notes.length > 0
          ? it.notes
              .filter((n) => n && n.trim())
              .map(
                (n) =>
                  `<div style="font-size: 8px; color: #444; padding-left: 6px; font-style: italic; line-height: 1.15; margin-top: 1px;">Obs: ${escapeHtml(n)}</div>`
              )
              .join('')
          : '';

      return `
        <div style="margin-bottom: 3px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 3px;">
            <div style="font-weight: 700; flex: 1; word-break: break-word; line-height: 1.2;">
              ${it.quantity}x ${escapeHtml(it.name)}
            </div>
            <div style="font-weight: 800; white-space: nowrap; flex-shrink: 0; padding-left: 4px;">
              ${formatBRL(it.total_cents)}
            </div>
          </div>
          ${addonsHtml}
          ${notesHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div class="thermal-receipt-container" style="
      width: ${printableWidthMm};
      max-width: ${printableWidthMm};
      margin: 0;
      padding: 1mm ${rightPaddingMm} 1mm 0.5mm;
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSizePx};
      line-height: 1.22;
      color: #000000;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    ">
      <!-- Cabeçalho Estabelecimento -->
      <div style="text-align: center; margin-bottom: 3px;">
        <div style="font-size: 11.5px; font-weight: 900; letter-spacing: 0.2px; text-transform: uppercase; line-height: 1.15;">
          ${escapeHtml(data.establishmentName)}
        </div>
        ${
          data.establishmentDescription
            ? `<div style="font-size: 8.5px; color: #333; margin-top: 1px; line-height: 1.15;">${escapeHtml(data.establishmentDescription)}</div>`
            : ''
        }
        ${
          data.establishmentPhone
            ? `<div style="font-size: 9px; font-weight: 700; margin-top: 1px;">Tel: ${escapeHtml(data.establishmentPhone)}</div>`
            : ''
        }
        ${
          data.establishmentAddress
            ? `<div style="font-size: 8.5px; color: #333; line-height: 1.15;">${escapeHtml(data.establishmentAddress)}</div>`
            : ''
        }
      </div>

      <!-- Data e Hora -->
      <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; margin: 3.5px 0;">
        <span>${dateStr}</span>
        <span>${timeStr}</span>
      </div>

      <!-- Identificação Mesa / Comanda e Cliente Vinculado -->
      <div style="margin-bottom: 2px;">
        <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.2;">
          ${escapeHtml(data.tableName || 'Balcão')}
        </div>
        <div style="font-size: 8.5px; font-weight: 800; color: #000; word-break: break-word; line-height: 1.25; margin-top: 1px;">
          <span>Comanda: #${escapeHtml((data.tabCode || '').slice(-6))}</span>${
            data.customerName ? ` - ${escapeHtml(data.customerName)}` : ''
          }${
            data.customerPhone ? ` • Tel: ${escapeHtml(data.customerPhone)}` : ''
          }
        </div>
      </div>

      <!-- Separador Duplo -->
      <div style="border-top: 2px solid #000; margin: 3px 0 2.5px 0;"></div>

      <!-- Cabeçalho Tabela Itens -->
      <div style="display: flex; justify-content: space-between; font-size: 8.5px; font-weight: 900; text-transform: uppercase; border-bottom: 1px dashed #000; padding-bottom: 1.5px; margin-bottom: 3px;">
        <span>ITEM / PRODUTO</span>
        <span>TOTAL</span>
      </div>

      <!-- Lista de Itens -->
      <div style="margin-bottom: 3px;">
        ${itemsHtml}
      </div>

      <!-- Linha Separadora -->
      <div style="border-top: 1px dashed #000; margin: 4px 0 3px 0;"></div>

      <!-- Subtotal, Taxa de Serviço e Desconto -->
      <div style="font-size: ${fontSizePx}; line-height: 1.3;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal Consumo:</span>
          <span style="font-weight: 700;">${formatBRL(data.subtotalCents)}</span>
        </div>

        ${
          data.serviceFeeCents && data.serviceFeeCents > 0
            ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Taxa Serviço (${data.serviceFeePercent || 10}%):</span>
            <span style="font-weight: 700;">+${formatBRL(data.serviceFeeCents)}</span>
          </div>`
            : ''
        }

        ${
          data.discountCents && data.discountCents > 0
            ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Desconto:</span>
            <span style="font-weight: 700;">-${formatBRL(data.discountCents)}</span>
          </div>`
            : ''
        }

        <!-- TOTAL GERAL EM DESTAQUE -->
        <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; margin: 4px 0; padding: 2px 0; display: flex; justify-content: space-between; font-size: ${widthMode === '80mm' ? '13px' : '11.5px'}; font-weight: 900;">
          <span>TOTAL A PAGAR:</span>
          <span>${formatBRL(data.finalTotalCents)}</span>
        </div>

        ${
          data.paidCents && data.paidCents > 0
            ? `
          <div style="display: flex; justify-content: space-between; font-size: 9px; color: #444;">
            <span>Valor Já Pago:</span>
            <span>${formatBRL(data.paidCents)}</span>
          </div>`
            : ''
        }

        ${
          data.remainingDueCents !== undefined && data.remainingDueCents > 0
            ? `
          <div style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 2px;">
            <span>SALDO RESTANTE:</span>
            <span>${formatBRL(data.remainingDueCents)}</span>
          </div>`
            : ''
        }
      </div>

      <!-- Rodapé Fiscal / Documento -->
      <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 3px; text-align: center; font-size: 8.5px; color: #333; line-height: 1.25;">
        <div style="font-weight: 800;">*** DOCUMENTO DE CONFERÊNCIA ***</div>
        <div>NÃO É DOCUMENTO FISCAL</div>
        <div style="margin-top: 3px; font-weight: 700; color: #000;">
          ${escapeHtml(data.footerMessage || 'Agradecemos a preferência! 🍻')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Dispara a impressão na impressora térmica através de um IFrame isolado
 */
export function printThermalReceipt(data: ThermalReceiptData): void {
  const widthMode = data.paperWidth || getStoredPaperWidth();
  const printableWidthMm = widthMode === '80mm' ? '70mm' : (widthMode === '58mm-wide' ? '46mm' : '42mm');
  const paperSizeRule = widthMode === '80mm' ? '80mm auto' : '58mm auto';

  const htmlBody = buildThermalReceiptHtml(data);

  // Remove iframe anterior se existir
  const existingIframe = document.getElementById('thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Cria iframe invisível
  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.setAttribute(
    'style',
    'position: fixed; right: -9999px; bottom: -9999px; width: 0; height: 0; border: 0; overflow: hidden;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(renderFullHtmlPage(htmlBody, paperSizeRule, printableWidthMm));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    }
    return;
  }

  doc.open();
  doc.write(renderFullHtmlPage(htmlBody, paperSizeRule, printableWidthMm));
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[ThermalPrinter] Erro ao disparar print no iframe:', err);
    }
  }, 250);
}

function renderFullHtmlPage(htmlBody: string, paperSizeRule: string, printableWidthMm: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Cupom de Conferência</title>
        <style>
          @page {
            size: ${paperSizeRule};
            margin: 0mm !important;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: ${printableWidthMm} !important;
              max-width: ${printableWidthMm} !important;
            }
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #000000;
            width: ${printableWidthMm};
            max-width: ${printableWidthMm};
          }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// CONFIGURAÇÕES DE IMPRESSÃO AUTOMÁTICA & BLUETOOTH / RAWBT
// ============================================================================

const STORAGE_KEY_AUTO_PRINT = 'ct_thermal_auto_print';
const STORAGE_KEY_PRINT_METHOD = 'ct_thermal_print_method';

export type ThermalPrintMethod = 'browser' | 'bluetooth' | 'rawbt';

export function isAutoPrintEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_PRINT);
    if (val === null) return true; // Ativo por padrão para agilizar a operação do espetinho
    return val === 'true';
  } catch {
    return true;
  }
}

export function setAutoPrintEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_PRINT, enabled ? 'true' : 'false');
  } catch {}
}

export function getStoredPrintMethod(): ThermalPrintMethod {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRINT_METHOD);
    if (saved === 'bluetooth' || saved === 'rawbt' || saved === 'browser') {
      return saved as ThermalPrintMethod;
    }
  } catch {}
  return 'browser';
}

export function setStoredPrintMethod(method: ThermalPrintMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRINT_METHOD, method);
  } catch {}
}

// ============================================================================
// WEB BLUETOOTH (ESC/POS Direto via Navegador Chrome/Edge)
// ============================================================================

interface BluetoothDeviceWithGatt extends EventTarget {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<any>;
    disconnect(): void;
    getPrimaryService(service: any): Promise<any>;
    getPrimaryServices(): Promise<any[]>;
  };
}

let activeBluetoothDevice: BluetoothDeviceWithGatt | null = null;
let activeBluetoothCharacteristic: any = null;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isBluetoothConnected(): boolean {
  return Boolean(activeBluetoothDevice?.gatt?.connected && activeBluetoothCharacteristic);
}

export function getBluetoothDeviceName(): string | null {
  return activeBluetoothDevice?.name || null;
}

export function disconnectBluetoothPrinter(): void {
  try {
    if (activeBluetoothDevice?.gatt?.connected) {
      activeBluetoothDevice.gatt.disconnect();
    }
  } catch {}
  activeBluetoothDevice = null;
  activeBluetoothCharacteristic = null;
}

/**
 * Conecta via Web Bluetooth com a impressora térmica pareada.
 * Suporta os UUIDs de serviço mais comuns em mini impressoras térmicas ESC/POS (POS-58, Goojprt, MP58C7).
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName: string; error?: string }> {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      deviceName: '',
      error: 'Seu navegador não suporta Web Bluetooth. Recomendamos o Google Chrome no Android ou Windows.',
    };
  }

  try {
    const nav = navigator as any;
    // Pede ao usuário para selecionar a impressora bluetooth da lista
    const device: BluetoothDeviceWithGatt = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['e7810a71-73ae-499d-8c15-4aaf9be60e05'] },
        { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-4aaf9be60e05',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
      ],
      acceptAllDevices: false,
    });

    if (!device || !device.gatt) {
      throw new Error('Nenhum dispositivo Bluetooth selecionado.');
    }

    const server = await device.gatt.connect();
    
    // Tenta encontrar a característica de escrita nos serviços conhecidos
    let writeChar: any = null;
    const services = await server.getPrimaryServices();

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties?.write || char.properties?.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      } catch {}
    }

    if (!writeChar) {
      throw new Error('Canal de envio ESC/POS não encontrado na impressora.');
    }

    activeBluetoothDevice = device;
    activeBluetoothCharacteristic = writeChar;
    setStoredPrintMethod('bluetooth');

    return {
      success: true,
      deviceName: device.name || 'Impressora Bluetooth',
    };
  } catch (err: any) {
    console.warn('[WebBluetooth] Falha ao parear impressora:', err);
    return {
      success: false,
      deviceName: '',
      error: err.message || 'Falha ao conectar via Bluetooth',
    };
  }
}

/**
 * Envia bytes ESC/POS diretamente para a impressora Bluetooth conectada
 */
export async function sendEscPosToBluetooth(data: Uint8Array): Promise<boolean> {
  if (!activeBluetoothCharacteristic) return false;
  try {
    // Escreve em blocos de até 100 bytes (limite MTU BLE seguro)
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (activeBluetoothCharacteristic.writeValueWithoutResponse) {
        await activeBluetoothCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await activeBluetoothCharacteristic.writeValue(chunk);
      }
    }
    return true;
  } catch (err) {
    console.error('[WebBluetooth] Erro ao enviar dados ESC/POS:', err);
    return false;
  }
}

// ============================================================================
// RAWBT PRINT SERVICE (Padrão Android via WebSocket local ou Intent)
// ============================================================================

export async function printViaRawBT(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const socket = new WebSocket('ws://127.0.0.1:40213/');
      const timeout = setTimeout(() => {
        try { socket.close(); } catch {}
        resolve(false);
      }, 1500);

      socket.onopen = () => {
        clearTimeout(timeout);
        socket.send(text);
        setTimeout(() => {
          socket.close();
          resolve(true);
        }, 300);
      };

      socket.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// FORMATAÇÃO E IMPRESSÃO DE COMANDA DE PEDIDO (ENTRADA DO SITE)
// ============================================================================

export function formatOrderTicketAsPlainText(order: Order, tab?: Tab): string {
  const widthMode = getStoredPaperWidth();
  const cols = widthMode === '80mm' ? 42 : (widthMode === '58mm-wide' ? 32 : 30);
  const divider = '-'.repeat(cols);
  const doubleDivider = '='.repeat(cols);

  const padBoth = (str: string, width: number) => {
    const s = str.slice(0, width);
    const pad = Math.max(0, width - s.length);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + s + ' '.repeat(right);
  };

  const padRow = (left: string, right: string, width: number) => {
    const maxLeft = width - right.length - 1;
    const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
    const spaces = Math.max(1, width - l.length - right.length);
    return l + ' '.repeat(spaces) + right;
  };

  const lines: string[] = [];

  lines.push(doubleDivider);
  lines.push(padBoth('CT CONVENIENCIA & ESPETINHO', cols));
  lines.push(padBoth('*** COMANDA DE PRODUCAO ***', cols));
  lines.push(doubleDivider);

  // Número do pedido e identificação
  lines.push(padRow(`PEDIDO #${order.order_number}`, new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), cols));

  const tableNum = order.table_number || (tab?.table?.table_number);
  const tableLabel = tableNum ? `MESA ${String(tableNum).padStart(2, '0')}` : (order.order_type === 'delivery' ? 'DELIVERY' : 'RETIRADA / BALCAO');
  lines.push(padRow('LOCAL:', tableLabel, cols));

  if (order.customer_name || tab?.customer_name) {
    const name = order.customer_name || tab?.customer_name || '';
    lines.push(`CLIENTE: ${name}`);
  }
  if (order.customer_phone || tab?.customer_phone) {
    const phone = order.customer_phone || tab?.customer_phone || '';
    lines.push(`TELEFONE: ${phone}`);
  }
  if (order.delivery_address) {
    lines.push(`ENDERECO: ${order.delivery_address}`);
  }

  lines.push(divider);
  lines.push(padRow('ITEM / PRODUTO', 'QTD', cols));
  lines.push(divider);

  order.items.forEach((it) => {
    lines.push(padRow(`${it.quantity}x ${it.product_name.toUpperCase()}`, formatBRL(it.total_cents), cols));
    if (it.addons_snapshot && it.addons_snapshot.length > 0) {
      it.addons_snapshot.forEach((ad) => {
        lines.push(`  + ${ad.name}`);
      });
    }
    if (it.notes && it.notes.trim()) {
      lines.push(`  OBS: ${it.notes.trim()}`);
    }
  });

  if (order.general_notes && order.general_notes.trim()) {
    lines.push(divider);
    lines.push(`OBS GERAL: ${order.general_notes.trim()}`);
  }

  lines.push(doubleDivider);
  lines.push(padRow('TOTAL DO PEDIDO:', formatBRL(order.total_cents), cols));
  lines.push(doubleDivider);
  lines.push('\n\n\n'); // Espaço para destaque e corte

  return lines.join('\n');
}

export function buildOrderTicketHtml(order: Order, tab?: Tab): string {
  const widthMode = getStoredPaperWidth();
  const printableWidthMm = widthMode === '80mm' ? '70mm' : (widthMode === '58mm-wide' ? '46mm' : '42mm');
  const fontSizePx = widthMode === '80mm' ? '12px' : (widthMode === '58mm-wide' ? '10.5px' : '10px');
  const rightPaddingMm = widthMode === '80mm' ? '2mm' : (widthMode === '58mm-wide' ? '1.5mm' : '2.5mm');

  const dt = new Date(order.created_at);
  const dateStr = dt.toLocaleDateString('pt-BR');
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const tableNum = order.table_number || (tab?.table?.table_number);
  const tableLabel = tableNum ? `MESA ${String(tableNum).padStart(2, '0')}` : (order.order_type === 'delivery' ? 'DELIVERY' : 'RETIRADA / BALCÃO');

  const itemsHtml = order.items
    .map((it) => {
      const addons = (it.addons_snapshot || [])
        .map((a) => `<div style="font-size: 8.5px; color: #222; padding-left: 6px;">+ ${escapeHtml(a.name)}</div>`)
        .join('');
      const notes = it.notes ? `<div style="font-size: 8px; color: #444; font-style: italic; padding-left: 6px;">Obs: ${escapeHtml(it.notes)}</div>` : '';

      return `
        <div style="margin-bottom: 4px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: ${fontSizePx}; line-height: 1.2;">
            <span>${it.quantity}x ${escapeHtml(it.product_name)}</span>
            <span>${formatBRL(it.total_cents)}</span>
          </div>
          ${addons}
          ${notes}
        </div>
      `;
    })
    .join('');

  return `
    <div class="thermal-receipt-container" style="
      width: ${printableWidthMm};
      max-width: ${printableWidthMm};
      margin: 0;
      padding: 1mm ${rightPaddingMm} 2mm 0.5mm;
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSizePx};
      line-height: 1.22;
      color: #000000;
      background: #ffffff;
    ">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 4px;">
        <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px;">CT CONVENIÊNCIA & ESPETINHO</div>
        <div style="font-size: 13px; font-weight: 900; margin-top: 2px; background: #000; color: #fff; padding: 1px 0;">
          PEDIDO #${order.order_number}
        </div>
        <div style="font-size: 12px; font-weight: 900; margin-top: 2px;">
          ${escapeHtml(tableLabel)}
        </div>
        <div style="font-size: 8.5px; color: #333; margin-top: 1px;">
          ${dateStr} às ${timeStr} • ${order.origin === 'external_catalog' ? 'Site Cardápio' : 'Garçom / Local'}
        </div>
      </div>

      ${
        order.customer_name || tab?.customer_name
          ? `<div style="font-size: 9px; margin-bottom: 3px;"><strong>Cliente:</strong> ${escapeHtml(order.customer_name || tab?.customer_name || '')}</div>`
          : ''
      }
      ${
        order.customer_phone || tab?.customer_phone
          ? `<div style="font-size: 9px; margin-bottom: 3px;"><strong>Tel:</strong> ${escapeHtml(order.customer_phone || tab?.customer_phone || '')}</div>`
          : ''
      }
      ${
        order.delivery_address
          ? `<div style="font-size: 9px; margin-bottom: 3px;"><strong>Endereço:</strong> ${escapeHtml(order.delivery_address)}</div>`
          : ''
      }

      <div style="border-top: 1px dashed #000; margin: 3px 0;"></div>
      <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">ITENS DO PEDIDO</div>
      
      <div>${itemsHtml}</div>

      ${
        order.general_notes
          ? `<div style="background: #f0f0f0; border-left: 2px solid #000; padding: 2px 4px; font-size: 8.5px; margin-top: 3px;">
              <strong>Obs Geral:</strong> ${escapeHtml(order.general_notes)}
            </div>`
          : ''
      }

      <div style="border-top: 2px solid #000; margin-top: 5px; padding-top: 3px; display: flex; justify-content: space-between; font-weight: 900; font-size: 12px;">
        <span>TOTAL:</span>
        <span>${formatBRL(order.total_cents)}</span>
      </div>

      <div style="text-align: center; font-size: 8px; color: #555; margin-top: 6px; border-top: 1px dashed #000; padding-top: 3px;">
        *** IMPRESSÃO AUTOMÁTICA CT ***
      </div>
    </div>
  `;
}

/**
 * Dispara a impressão de comanda para um pedido recebido.
 * Prioriza Web Bluetooth / RawBT se configurados, com fallback transparente para o iframe do navegador.
 */
export async function printOrderTicket(order: Order, tab?: Tab): Promise<boolean> {
  const method = getStoredPrintMethod();
  const plainText = formatOrderTicketAsPlainText(order, tab);

  // 1. Método Bluetooth Direto
  if (method === 'bluetooth' && isBluetoothConnected()) {
    try {
      const encoder = new TextEncoder();
      // ESC @ (inicializa) + texto + pulo de linhas
      const escPosBytes = new Uint8Array([0x1b, 0x40, ...encoder.encode(plainText), 0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x41, 0x03]);
      const success = await sendEscPosToBluetooth(escPosBytes);
      if (success) return true;
    } catch (err) {
      console.warn('[AutoPrint] Falha Bluetooth, tentando fallback:', err);
    }
  }

  // 2. Método RawBT (Android)
  if (method === 'rawbt') {
    const rawbtSuccess = await printViaRawBT(plainText);
    if (rawbtSuccess) return true;
  }

  // 3. Fallback Padrão: Navegador (IFrame silencioso / Impressão nativa)
  const widthMode = getStoredPaperWidth();
  const printableWidthMm = widthMode === '80mm' ? '70mm' : (widthMode === '58mm-wide' ? '46mm' : '42mm');
  const paperSizeRule = widthMode === '80mm' ? '80mm auto' : '58mm auto';
  const htmlBody = buildOrderTicketHtml(order, tab);

  const existingIframe = document.getElementById('thermal-print-order-iframe');
  if (existingIframe) existingIframe.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-order-iframe';
  iframe.setAttribute(
    'style',
    'position: fixed; right: -9999px; bottom: -9999px; width: 0; height: 0; border: 0; overflow: hidden;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(renderFullHtmlPage(htmlBody, paperSizeRule, printableWidthMm));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    }
    return true;
  }

  doc.open();
  doc.write(renderFullHtmlPage(htmlBody, paperSizeRule, printableWidthMm));
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[ThermalPrinter] Erro no print do pedido:', err);
    }
  }, 250);

  return true;
}

/**
 * Imprime cupom de teste para validar a impressora Bluetooth / Térmica
 */
export async function testPrintDemo(): Promise<boolean> {
  const dummyOrder: Order = {
    id: `test-print-${Date.now()}`,
    establishment_id: 'ct-main',
    order_number: 99,
    origin: 'external_catalog',
    order_type: 'dine_in',
    status: 'received',
    created_by: null,
    customer_name: 'Cliente Teste Impressão',
    customer_phone: '(44) 99999-9999',
    delivery_address: null,
    general_notes: 'Imprimindo teste de conexão Bluetooth e margem térmica',
    total_cents: 3400,
    created_at: new Date().toISOString(),
    table_number: 1,
    items: [
      {
        id: 'it-1',
        order_id: 'test',
        product_id: 'p1',
        product_name: 'Espetinho de Alcatra Nobre',
        quantity: 2,
        unit_price_cents: 1200,
        addons_snapshot: [{ name: 'Farofa & Mandioca Amanteigada', price_cents: 0 }],
        addons_total_cents: 0,
        total_cents: 2400,
        notes: 'Ao ponto',
        sector: 'churrasqueira',
        status: 'received',
        prepared_at: null,
        delivered_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'it-2',
        order_id: 'test',
        product_id: 'p2',
        product_name: 'Refrigerante Lata 350ml',
        quantity: 1,
        unit_price_cents: 600,
        addons_snapshot: [],
        addons_total_cents: 0,
        total_cents: 600,
        notes: 'Com gelo e limão',
        sector: 'bar',
        status: 'received',
        prepared_at: null,
        delivered_at: null,
        created_at: new Date().toISOString(),
      },
    ],
  };

  return printOrderTicket(dummyOrder);
}
