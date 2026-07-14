import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const containerId = 'barcode-reader';

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 280, height: 120 },
        aspectRatio: 1.5,
      },
      (decodedText) => {
        scanner.stop().then(() => {
          onScan(decodedText);
        }).catch(() => {});
      },
      () => {} // ignore scan errors (no code found yet)
    ).catch((err: any) => {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error('Camera error:', err);
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div className="card" style={{ width: 400, maxWidth: '95vw', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} /> Escanear Código de Barras
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={() => {
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().catch(() => {});
            }
            onClose();
          }}>
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--danger-400)',
            background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)',
          }}>
            <Camera size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ fontSize: 14 }}>{error}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Dica: Use HTTPS ou localhost para acessar a câmera
            </p>
          </div>
        ) : (
          <>
            <div
              id={containerId}
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#000',
              }}
            />
            <p style={{
              textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
              marginTop: 12,
            }}>
              Aponte a câmera para o código de barras do produto
            </p>
          </>
        )}

        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: 16 }}
          onClick={() => {
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().catch(() => {});
            }
            onClose();
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;
