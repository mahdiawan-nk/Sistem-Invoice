import React, { useState } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { formatCurrency } from '../utils/formatters';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState<number>(invoice.balanceDue > 0 ? invoice.balanceDue : invoice.grandTotal);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('bank_transfer');
  const [destinationBank, setDestinationBank] = useState<string>(
    invoice.companySnapshot?.bankAccounts?.[0]
      ? `${invoice.companySnapshot.bankAccounts[0].bankName} - ${invoice.companySnapshot.bankAccounts[0].accountNumber}`
      : 'Bank Central Asia (BCA)'
  );
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal pembayaran harus lebih dari 0.');
      return;
    }
    if (!paymentDate) {
      setError('Tanggal pembayaran wajib diisi.');
      return;
    }

    onPaymentRecorded({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentDate,
      amount: Number(amount),
      paymentMethod,
      destinationBank,
      referenceNumber: referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
      notes,
      recordedBy: 'Finance Staff',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Catat Pembayaran</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Outstanding Summary */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Total Tagihan:</span>
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {formatCurrency(invoice.grandTotal, invoice.currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Sudah Dibayar:</span>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {formatCurrency(invoice.paidAmount, invoice.currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Sisa Piutang:</span>
              <span className="font-mono font-bold text-rose-600 tabular-nums">
                {formatCurrency(invoice.balanceDue, invoice.currency)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Pembayaran (Rp) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 tabular-nums"
                required
              />
              {invoice.balanceDue > 0 && amount !== invoice.balanceDue && (
                <button
                  type="button"
                  onClick={() => setAmount(invoice.balanceDue)}
                  className="absolute right-2 top-2 text-xs text-sky-600 hover:text-sky-800 font-medium px-1.5 py-0.5 bg-sky-50 rounded"
                >
                  Lunasi Penuh
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pembayaran *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                <option value="bank_transfer">Transfer Bank</option>
                <option value="cash">Tunai / Cash</option>
                <option value="qris">QRIS</option>
                <option value="credit_card">Kartu Kredit / Debit</option>
                <option value="cheque">Giro / Cek</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rekening / Kas Tujuan
            </label>
            <input
              type="text"
              value={destinationBank}
              onChange={(e) => setDestinationBank(e.target.value)}
              placeholder="Contoh: BCA - 018-892-7712 a.n Djoeta Project"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Referensi Transaksi / Bukti
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Contoh: TRX-BCA-98102391"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pembayaran
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan (opsional)..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 size={15} />
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
