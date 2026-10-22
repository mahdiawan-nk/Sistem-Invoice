import React, { useState } from 'react';
import { TemplatePreset, InvoiceLayoutConfig, Invoice } from '../types';
import { dataService } from '../services/dataService';
import { InvoiceRenderer } from './InvoiceRenderer';
import {
  Sliders,
  Plus,
  Save,
  Copy,
  Trash2,
  Check,
  RotateCcw,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface LayoutBuilderViewProps {
  templates: TemplatePreset[];
  sampleInvoice: Invoice;
  onTemplatesUpdated: () => void;
}

export const LayoutBuilderView: React.FC<LayoutBuilderViewProps> = ({
  templates,
  sampleInvoice,
  onTemplatesUpdated,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || 'corporate-classic'
  );

  const activePreset = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const [config, setConfig] = useState<InvoiceLayoutConfig>({ ...activePreset.config });
  const [templateName, setTemplateName] = useState(activePreset.name);
  const [templateDesc, setTemplateDesc] = useState(activePreset.description);
  const [isDefault, setIsDefault] = useState(activePreset.isDefault);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setConfig({ ...tmpl.config });
      setTemplateName(tmpl.name);
      setTemplateDesc(tmpl.description);
      setIsDefault(tmpl.isDefault);
    }
  };

  const handleCloneTemplate = () => {
    const newId = `custom-tmpl-${Date.now()}`;
    const newName = `${templateName} (Salinan)`;
    const newPreset: TemplatePreset = {
      id: newId,
      name: newName,
      description: `Kustomisasi berbasis ${templateName}`,
      isDefault: false,
      config: {
        ...config,
        templateId: newId,
        templateName: newName,
      },
    };
    dataService.saveTemplate(newPreset);
    onTemplatesUpdated();
    setSelectedTemplateId(newId);
    setTemplateName(newName);
    setTemplateDesc(newPreset.description);
    setIsDefault(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPreset: TemplatePreset = {
      id: selectedTemplateId,
      name: templateName,
      description: templateDesc,
      isDefault,
      config: {
        ...config,
        templateName,
      },
    };
    dataService.saveTemplate(updatedPreset);
    onTemplatesUpdated();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) {
      alert('Sistem harus memiliki minimal satu template invoice.');
      return;
    }
    if (confirm(`Hapus template "${templateName}"?`)) {
      dataService.deleteTemplate(selectedTemplateId);
      onTemplatesUpdated();
      setSelectedTemplateId(templates[0].id);
      setConfig(templates[0].config);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dynamic Invoice Layout Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kustomisasi tata letak, posisi logo, palet warna, tipografi, dan visibilitas section dokumen bisnis tanpa kode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCloneTemplate}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Copy size={14} />
            <span>Duplikasi Template Ini</span>
          </button>
        </div>
      </div>

      {/* Preset Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => handleSelectTemplate(tmpl.id)}
            className={`p-3 text-left rounded-xl border text-xs transition-all ${
              selectedTemplateId === tmpl.id
                ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold truncate">{tmpl.name}</span>
              {tmpl.isDefault && (
                <span className="text-[9px] bg-sky-200 text-sky-800 px-1 rounded font-semibold">
                  Default
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
              {tmpl.description}
            </p>
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Pengaturan template berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {/* Main Split: Layout Customizer Controls on Left, Live Render on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (Col 5) */}
        <form onSubmit={handleSave} className="lg:col-span-5 space-y-5">
          {/* Template Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Identitas Template
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Template</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Peruntukan</label>
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Jadikan sebagai template default untuk invoice baru</span>
              </label>
            </div>
          </div>

          {/* Logo & Header Placement */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Tata Letak Logo & Kop Dokumen
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Posisi Logo</label>
                <div className="flex gap-1.5">
                  {(['left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setConfig({ ...config, logoPosition: pos })}
                      className={`flex-1 py-1 text-xs rounded border capitalize ${
                        config.logoPosition === pos
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {pos === 'left' ? 'Kiri' : pos === 'center' ? 'Tengah' : 'Kanan'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ukuran Lebar Logo: {config.logoWidth}px
                </label>
                <input
                  type="range"
                  min="90"
                  max="240"
                  step="10"
                  value={config.logoWidth}
                  onChange={(e) => setConfig({ ...config, logoWidth: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Color & Typography */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Warna & Tipografi
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warna Utama</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        primaryColor: e.target.value,
                        tableHeaderBg: e.target.value,
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs">{config.primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Font Family</label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => setConfig({ ...config, fontFamily: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                >
                  <option value="plus-jakarta">Plus Jakarta Sans (Modern)</option>
                  <option value="inter">System Sans (Clean)</option>
                  <option value="serif">Georgia (Formal Serif)</option>
                  <option value="mono">JetBrains Mono (Technical)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Header Tabel BG</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.tableHeaderBg}
                    onChange={(e) => setConfig({ ...config, tableHeaderBg: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs">{config.tableHeaderBg}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Skala Kerapatan</label>
                <select
                  value={config.fontSizeScale}
                  onChange={(e) => setConfig({ ...config, fontSizeScale: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                >
                  <option value="compact">Kompak / Padat</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Lega / Berjarak</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Visibility Toggles */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Blok Section Aktif
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showLogo}
                  onChange={(e) => setConfig({ ...config, showLogo: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Logo Perusahaan</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showCompanyInfo}
                  onChange={(e) => setConfig({ ...config, showCompanyInfo: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Alamat & Kontak Pengirim</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showCustomerInfo}
                  onChange={(e) => setConfig({ ...config, showCustomerInfo: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Data Pelanggan (Bill To)</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showPaymentInfo}
                  onChange={(e) => setConfig({ ...config, showPaymentInfo: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Rekening Bank Transfer</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showTerbilang}
                  onChange={(e) => setConfig({ ...config, showTerbilang: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Terbilang Rupiah</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showSignature}
                  onChange={(e) => setConfig({ ...config, showSignature: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Tanda Tangan Direktur</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showStamp}
                  onChange={(e) => setConfig({ ...config, showStamp: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Stempel Perusahaan</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showNotes}
                  onChange={(e) => setConfig({ ...config, showNotes: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Catatan & Syarat Bayar</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            {templates.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                <span>Hapus Template</span>
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ml-auto"
            >
              <Save size={15} />
              <span>Simpan Konfigurasi Template</span>
            </button>
          </div>
        </form>

        {/* Live A4 Render Column (Col 7) */}
        <div className="lg:col-span-7 sticky top-6">
          <div className="bg-slate-200/80 p-5 rounded-xl border border-slate-300 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-300 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Eye size={14} className="text-sky-700" />
                <span>Live Dokumen A4 Rendering (Sample Djoeta Project)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Ukuran proporsional sesuai cetak
              </span>
            </div>

            <div className="overflow-x-auto flex justify-center">
              <InvoiceRenderer
                invoice={sampleInvoice}
                layoutOverride={config}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
