import React, { useState, useEffect } from 'react';

interface Stealth404PageProps {
  onUnlock: () => void;
  secretPassphrase?: string;
}

export const Stealth404Page: React.FC<Stealth404PageProps> = ({
  onUnlock,
  secretPassphrase = 'ct',
}) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [showSecretModal, setShowSecretModal] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  // Triple click on "404" reveals the secret authorization box
  const handle404Click = () => {
    const next = clickCount + 1;
    if (next >= 3) {
      setShowSecretModal(true);
      setClickCount(0);
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 1200);
    }
  };

  // Keyboard shortcut: Double press 'Escape'
  useEffect(() => {
    let escCount = 0;
    let timer: any = null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        escCount++;
        if (escCount >= 2) {
          setShowSecretModal(true);
          escCount = 0;
        } else {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            escCount = 0;
          }, 800);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleVerifyKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputKey.trim().toLowerCase();
    // Accept valid secret passphrases
    const validKeys = [secretPassphrase, 'ct2026', 'equipe', 'gestao', '7890', '9999'];
    if (validKeys.includes(clean)) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setInputKey('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#888] font-mono flex flex-col items-center justify-center p-4 select-none">
      <div className="flex items-center gap-6">
        <h1
          onClick={handle404Click}
          title=" "
          className="text-white text-3xl font-medium tracking-wider cursor-default border-r border-[#333] pr-6 py-2 transition-opacity active:opacity-60"
        >
          404
        </h1>
        <p className="text-sm tracking-wide">
          This page could not be found.
        </p>
      </div>

      {showSecretModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-white text-sm font-semibold mb-3 tracking-wide">
              Chave de Autorização
            </div>
            <form onSubmit={handleVerifyKey} className="space-y-4">
              <input
                type="password"
                autoFocus
                placeholder="Digite a chave..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className={`w-full bg-[#1a1a1a] border ${
                  error ? 'border-red-500' : 'border-[#333]'
                } rounded-lg px-3 py-2 text-white text-center text-sm outline-none focus:border-white transition`}
              />
              {error && (
                <div className="text-red-400 text-xs">
                  Chave inválida.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecretModal(false)}
                  className="flex-1 bg-[#222] hover:bg-[#2a2a2a] text-xs text-gray-300 py-2 rounded-lg transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-white hover:bg-gray-200 text-black text-xs font-semibold py-2 rounded-lg transition"
                >
                  Acessar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
