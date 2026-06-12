"use client";

import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const READER_ID = "mbx-qr-reader";

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const stop = async () => {
      const s = scannerRef.current;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    };

    const startScan = async () => {
      // Import dynamique : la lib ne doit jamais être évaluée côté serveur.
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" }, // caméra arrière par défaut
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (handledRef.current) return;
            handledRef.current = true;
            if (navigator.vibrate) navigator.vibrate(120);
            stop().then(() => onScan(decodedText));
          },
          () => {
            /* erreurs de frame ignorées (pas de QR dans le cadre) */
          }
        );
      } catch (err) {
        setError(
          "Impossible d'accéder à la caméra. Autorisez l'accès caméra dans le navigateur."
        );
        console.error("QR start error:", err);
      }
    };

    startScan();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-[#0f0f13] border border-orange-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-lg">📷</span>
            <span className="text-white font-bold text-sm">Scanner un QR code</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none px-1"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Zone caméra */}
        <div className="relative bg-black">
          <div id={READER_ID} className="w-full" />
          {!error && (
            <p className="text-center text-gray-400 text-xs py-3 px-4">
              Visez le QR code <span className="text-orange-400">technicien</span> du ticket
            </p>
          )}
          {error && (
            <div className="p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-orange-500 text-black font-semibold rounded-xl text-sm"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
