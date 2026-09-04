import React, { useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
const STOCK_SECTORS = [
  'Banking & Financial Services',
  'Information Technology (IT)',
  'Pharmaceuticals & Healthcare',
  'Automobiles & Auto Components',
  'FMCG (Fast Moving Consumer Goods)',
  'Oil, Gas & Consumable Fuels',
  'Metals & Mining',
  'Power & Renewable Energy',
  'Real Estate & Construction',
  'Telecommunication',
  'Aviation & Defense',
  'Chemicals & Petrochemicals',
  'Capital Goods & Engineering',
  'Consumer Durables',
  'Media & Entertainment',
  'Textiles & Apparel',
  'Agriculture & Fertilizers',
  'Infrastructure & Logistics'
];

import { X, Download, Upload, Loader2, Save } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { base_api_url, base_ra_url } from '../utils/config';

interface ReportPreviewModalProps {
  signal: any;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportPreviewModal({ signal, user, onClose, onSuccess }: ReportPreviewModalProps) {
  const [rationale, setRationale] = useState('');
  const [technicalOutlook, setTechnicalOutlook] = useState('');
  const [sector, setSector] = useState('');
  const [sectorErr, setSectorErr] = useState('');
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setChartImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let imgWidth = pdfWidth;
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (canvas.width * pageHeight) / canvas.height;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
      
      const fileName = `Research_Report_${signal.stock?.symbol || 'Signal'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Upload to server
      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('report', pdfBlob, fileName);
      
      const res = await fetch(`${base_api_url}/signals/${signal.id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || ''
        },
        body: formData
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }
      
      // Also download locally
      pdf.save(fileName);
      
      toast.success('Report generated and uploaded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const trend = signal.callType === 'BUY' ? 'BULLISH' : 'BEARISH';
  const recDate = new Date(signal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase().replace(/ /g, '-');
  const actionText = signal.callType === 'BUY' ? 'Buy' : 'Sell';
  
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col md:flex-row h-[90vh]">
        {/* Editor Sidebar */}
        <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-white/10 p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configure Report</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/5 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sector<span className="text-red-600 dark:text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sector}
                  onFocus={() => setSectorDropdownOpen(true)}
                  onChange={(e) => {
                    setSector(e.target.value);
                    if (e.target.value.trim()) setSectorErr('');
                    setSectorDropdownOpen(true);
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-800/50 border ${sectorErr ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} rounded-xl p-3 pr-10 text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all`}
                  placeholder="Select or type custom sector..."
                />
                <button
                  type="button"
                  onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic Sector Dropdown */}
              {sectorDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSectorDropdownOpen(false)} />
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Popular Sectors (Click to select or type custom above)
                    </div>
                    {STOCK_SECTORS.filter(s => !sector || s.toLowerCase().includes(sector.toLowerCase())).map((sec) => (
                      <div
                        key={sec}
                        className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                        onClick={() => {
                          setSector(sec);
                          setSectorErr('');
                          setSectorDropdownOpen(false);
                        }}
                      >
                        <span>{sec}</span>
                        {sector === sec && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                      </div>
                    ))}
                    {STOCK_SECTORS.filter(s => !sector || s.toLowerCase().includes(sector.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 italic">
                        Custom sector: "{sector}" (Will be used in report)
                      </div>
                    )}
                  </div>
                </>
              )}
              {sectorErr && <p className="text-red-600 dark:text-red-500 text-xs mt-1 font-medium">{sectorErr}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Technical Outlook (Optional)</label>
              <textarea
                value={technicalOutlook}
                onChange={(e) => setTechnicalOutlook(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[100px]"
                placeholder="Enter technical outlook..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rationale (Optional)</label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[100px]"
                placeholder="Enter fundamental/technical rationale..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Chart Screenshot (Optional)</label>
              <div className="relative">
                <input type="file" id="chartUpload" className="hidden" accept="image/*" onChange={handleChartUpload} />
                <label htmlFor="chartUpload" className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer border border-dashed border-slate-400 dark:border-white/20">
                  <Upload className="h-4 w-4" />
                  <span>{chartImage ? 'Change Image' : 'Upload Chart Image'}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={generatePDF}
              disabled={generating}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Generate & Upload PDF</span>
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-2">This will upload the report to the system and save a local copy.</p>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="w-full md:w-2/3 bg-slate-100 dark:bg-[#0f1523] p-6 overflow-y-auto flex items-start justify-center">
          <div className="w-[210mm] min-h-[297mm] bg-white text-black shadow-lg flex flex-col relative scale-[0.6] sm:scale-[0.8] xl:scale-90 origin-top" ref={reportRef} style={{ padding: '25mm' }}>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="w-32 h-12 bg-black flex items-center justify-center rounded">
                 {user?.tenant?.logoUrl ? (
                    <img src={user.tenant.logoUrl.startsWith('http') ? user.tenant.logoUrl : `${base_ra_url}${user.tenant.logoUrl}`} alt="Logo" className="max-h-10 max-w-[100px] object-contain" />
                 ) : (
                    <span className="text-white font-bold text-sm px-2 text-center">{user?.tenant?.name || 'StockBox'}</span>
                 )}
              </div>
              <div className="text-center flex-1 pr-16">
                 <h1 className="text-base font-bold text-slate-900">{signal.stock?.symbol || ''} ({signal.segment})</h1>
              </div>
            </div>
            
            {/* Subtitle */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-800 font-semibold mb-1">
                (Recommended {actionText} price-{signal.entryPrice}, Target-{[signal.target1, signal.target2, signal.target3].filter(Boolean).join('/')}, Stop loss-{signal.stoploss})
              </p>
              <p className="text-sm text-slate-800 font-semibold">Recommended Date-{recDate}</p>
            </div>

            {/* Table layout */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-20 w-3/4 mx-auto mb-8 text-sm">
              <div className="font-bold text-slate-700">SECTOR</div>
              <div className="text-slate-800">{sector || '-'}</div>
              
              <div className="font-bold text-slate-700">PRICE</div>
              <div className="text-slate-800">{signal.entryPrice}</div>
              
              <div className="font-bold text-slate-700">OPTION & FUTURE</div>
              <div className="text-slate-800">{signal.segment}</div>
              
              <div className="font-bold text-slate-700">TREND</div>
              <div className="text-slate-800 uppercase">{trend}</div>
              
              <div className="font-bold text-slate-700">VIEW</div>
              <div className="text-slate-800 uppercase">{signal.tradeDuration || 'INTRADAY'}</div>
            </div>

            {/* Content */}
            {technicalOutlook && (
              <div className="text-center mb-4">
                 <h4 className="text-sm font-bold text-red-600 uppercase underline underline-offset-4 decoration-red-600">TECHNICAL OUTLOOK</h4>
                 <p className="text-sm text-slate-800 mt-3 text-left">{technicalOutlook}</p>
              </div>
            )}
            
            {!technicalOutlook && (
               <div className="text-center mb-4">
                 <h4 className="text-sm font-bold text-red-600 uppercase underline underline-offset-4 decoration-red-600">TECHNICAL OUTLOOK</h4>
               </div>
            )}

            {chartImage && (
              <div className="mb-6 w-full flex justify-center">
                <img src={chartImage} alt="Chart" className="w-[80%] max-h-[250px] object-contain border border-slate-300 p-1" />
              </div>
            )}

            <div className="mb-6 text-sm text-slate-900">
               <span className="font-bold uppercase underline">RATIONALE:</span>
               {rationale ? (
                 <p className="mt-2 text-justify">{rationale}</p>
               ) : (
                 <p className="mt-2">No rationale provided.</p>
               )}
            </div>

            {/* Footer Details */}
            <div className="mt-auto border-t border-slate-200 pt-4 text-[9px] text-slate-800 leading-tight">
               <span className="font-bold underline uppercase block mb-1">DISCLOSURE:</span>
               <p className="mb-2 text-justify whitespace-pre-wrap text-[7px] leading-snug">
                 {user?.tenant?.reportDisclaimer || `I, ${user?.tenant?.name || 'Research Analyst'} (SEBI Registered Research Analyst. ${user?.tenant?.sebiRegistrationNo || 'INH000000000'}) Author of this report, hereby certify that everything expressed in this research report accurately reflect my views about the subject issuer(s) or securities. I have no material adverse disciplinary history as on the date of publication of this report. I also certify that no part of our compensation was, is or will be directly or indirectly related to specific recommendation(s) or view(s) in this report.
                 
I or my relatives does not have any financial interest in the subject company. Further Research analyst and his relative doesn't have any material conflict of interest.
                 
Any holding in stock- No
Compliance & grievance officer - ${user?.tenant?.complianceName || 'Mr. Compliance Officer'}
Phone no : ${user?.tenant?.mobile || '-'}, Email :- ${user?.tenant?.email || '-'}
Address :- ${user?.tenant?.address || '-'}
                 
Disclaimer- "Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors."`}
               </p>
               <div className="mt-4 flex justify-end">
                  <div className="text-center w-40">
                     {user?.tenant?.coSignatureUrl ? (
                        <img crossOrigin="anonymous" src={user.tenant.coSignatureUrl.startsWith('http') ? user.tenant.coSignatureUrl : `${base_ra_url}${user.tenant.coSignatureUrl}`} alt="Signature" className="h-12 object-contain mx-auto mb-1" />
                     ) : (
                        <div className="h-12"></div>
                     )}
                     <p className="text-[9px] font-bold border-t border-slate-500 pt-1">For {user?.tenant?.name || 'Research Analyst'}</p>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
