import React, { useState } from 'react';
import { Invoice } from '../types';
import { InvoiceRenderer } from './InvoiceRenderer';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { printInvoice } from '../utils/printUtility';
import { Printer, Download, CreditCard, X, Copy, Check, CheckCircle2 } from 'lucide-react';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
  onDuplicate,
}) => {
  if (!isOpen) return null;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handlePrint = () => {
    setFeedbackMessage('Mempersiapkan dokumen cetak A4...');
    setTimeout(() => {
      printInvoice(invoice, 'invoice-document-root');
      setTimeout(() => setFeedbackMessage(null), 1000);
    }, 150);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      setFeedbackMessage('Membuat dan mengunduh berkas PDF A4...');
      const safeFilename = `${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}_${invoice.customerSnapshot?.name || 'Customer'}.pdf`;
      await downloadInvoicePDF(invoice, 'invoice-document-root', safeFilename);
      setFeedbackMessage('Berkas PDF berhasil diunduh!');
      setTimeout(() => setFeedbackMessage(null), 2500);
    } catch (err: any) {
      console.error('PDF error', err);
      setFeedbackMessage(null);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto no-print">
      <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-5xl my-auto max-h-[95vh] flex flex-col border border-slate-300 overflow-hidden">
        {/* Top Action Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-slate-900 text-sm">{invoice.invoiceNumber}</span>
            <button
              onClick={handleCopyNumber}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
              title="Salin Nomor Invoice"
            >
              {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedLink ? 'Tersalin' : 'Salin No'}</span>
            </button>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                invoice.paymentStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.paymentStatus === 'partial'
                  ? 'bg-amber-100 text-amber-800'
                  : invoice.paymentStatus === 'overdue'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {invoice.paymentStatus === 'paid'
                ? 'Lunas'
                : invoice.paymentStatus === 'partial'
                ? 'Sebagian'
                : invoice.paymentStatus === 'overdue'
                ? 'Jatuh Tempo'
                : 'Belum Lunas'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRecordPayment && invoice.paymentStatus !== 'paid' && invoice.status !== 'cancelled' && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(invoice);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CreditCard size={14} />
                <span>Catat Bayar</span>
              </button>
            )}

            {onDuplicate && (
              <button
                onClick={() => {
                  onClose();
                  onDuplicate(invoice);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Copy size={14} />
                <span className="hidden sm:inline">Duplikasi</span>
              </button>
            )}

            {/* Tombol Cetak Langsung */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Cetak Dokumen Invoice (Dialog Cetak / Printer)"
            >
              <Printer size={15} className="text-slate-600" />
              <span>Cetak Invoice</span>
            </button>

            {/* Tombol Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 active:bg-sky-900 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Download Berkas PDF Resmi A4"
            >
              <Download size={15} />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback alert banner if downloading/printing */}
        {feedbackMessage && (
          <div className="bg-sky-600 text-white text-xs px-6 py-2 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={14} />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Scrollable A4 Document Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div className="w-full">
            <InvoiceRenderer invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
};
