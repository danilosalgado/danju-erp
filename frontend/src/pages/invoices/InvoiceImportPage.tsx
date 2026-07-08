import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Package, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse } from '../../types';

interface NFeProduct {
  code: string;
  barcode: string;
  name: string;
  ncm: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string; // CREATED, UPDATED, ERROR
  message: string;
}

interface NFeImportResult {
  supplierName: string;
  supplierCnpj: string;
  invoiceNumber: string;
  totalValue: number;
  products: NFeProduct[];
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const InvoiceImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<NFeImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xml')) {
      toast.error('Selecione um arquivo XML de NF-e');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const importNFe = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ApiResponse<NFeImportResult>>('/invoices/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      toast.success('Importação concluída!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao importar NF-e');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Importar Nota Fiscal</h1>
          <p>Importe XML de NF-e para cadastrar produtos automaticamente</p>
        </div>
      </div>

      {/* Upload Area */}
      {!result && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary-400)' : 'var(--border-glass)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '48px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: dragActive ? 'rgba(34,197,94,0.05)' : 'transparent',
            }}
          >
            <Upload size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ marginBottom: 8 }}>Arraste o arquivo XML aqui</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>ou clique para selecionar</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xml"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          {file && (
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={20} style={{ color: 'var(--primary-400)' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={importNFe} disabled={loading}>
                {loading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
                {loading ? 'Importando...' : 'Importar NF-e'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Resultado da Importação</h3>
              <button className="btn btn-ghost" onClick={() => { setResult(null); setFile(null); }}>
                Nova Importação
              </button>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fornecedor</div>
                <div style={{ fontWeight: 600 }}>{result.supplierName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CNPJ: {result.supplierCnpj}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nota Fiscal</div>
                <div style={{ fontWeight: 600 }}>Nº {result.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: {formatCurrency(result.totalValue)}</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{result.totalCreated}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Criados</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>{result.totalUpdated}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Atualizados</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{result.totalErrors}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Erros</div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Package size={18} /> Produtos ({result.products.length})</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Produto</th>
                  <th>Cód. Barras</th>
                  <th style={{ textAlign: 'center' }}>Qtd</th>
                  <th style={{ textAlign: 'right' }}>Valor Unit.</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.products.map((p, i) => (
                  <tr key={i}>
                    <td>
                      {p.status === 'CREATED' && <span className="badge badge-success"><CheckCircle size={12} /> Novo</span>}
                      {p.status === 'UPDATED' && <span className="badge badge-info"><AlertTriangle size={12} /> Atualizado</span>}
                      {p.status === 'ERROR' && <span className="badge badge-danger"><XCircle size={12} /> Erro</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      {p.message && <div style={{ fontSize: 12, color: p.status === 'ERROR' ? 'var(--danger-400)' : 'var(--text-muted)' }}>{p.message}</div>}
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.barcode || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{p.quantity} {p.unit}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.unitPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceImportPage;
