'use client';

import { FileText, Shield, AlertTriangle, ExternalLink, ScrollText } from 'lucide-react';

interface Props {
  pages?: any[];
  onReadDocument?: (page: any) => void;
}

export default function Legal({ pages = [], onReadDocument = () => {} }: Props) {
  const getPageDetails = (page: any) => {
    switch (page.slug) {
      case 'terms-conditions': return { icon: ScrollText, description: 'General terms of use for the platform and services.' };
      case 'privacy-policy': return { icon: Shield, description: 'How we collect, use, and protect your data.' };
      case 'refund-policy': return { icon: FileText, description: 'Guidelines regarding subscription cancellations and refunds.' };
      case 'disclosure': return { icon: AlertTriangle, description: 'Important risks associated with trading and investing in financial markets.' };
      case 'disclaimer': return { icon: Shield, description: 'Regulatory disclosures required by the Securities and Exchange Board of India.' };
      case 'grievance-redressal': return { icon: Shield, description: 'Grievance redressal mechanism and escalation matrix.' };
      case 'investor-charter': return { icon: ScrollText, description: 'Investor rights, responsibilities, and dos and don\'ts.' };
      case 'complaint-status': return { icon: AlertTriangle, description: 'Monthly statistics of complaints received and resolved.' };
      default: return { icon: FileText, description: 'View this document for more details.' };
    }
  };

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Legal & Disclosures</h1>
          <p className="text-sm text-premium-text/60 mt-1">Review our policies, terms, and regulatory disclosures.</p>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 text-center text-premium-text/60">
          No policies or disclosures have been published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pages.map((page, i) => {
            const details = getPageDetails(page);
            const Icon = details.icon;
            return (
              <div 
                key={page.id || i} 
                onClick={() => onReadDocument(page)}
                className="bg-premium-cards border border-premium-border rounded-3xl p-6 hover:border-premium-primary/50 transition-colors group cursor-pointer flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-premium-bg flex items-center justify-center shrink-0 group-hover:bg-premium-primary/10 transition-colors">
                    <Icon className="w-6 h-6 text-premium-text/70 group-hover:text-premium-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{page.title}</h3>
                    <p className="text-sm text-premium-text/60">{details.description}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-premium-border flex justify-end">
                  <button className="flex items-center gap-2 text-sm text-premium-primary font-medium hover:underline">
                    Read {page.title} {page.type === 'URL' ? <ExternalLink className="w-4 h-4" /> : null}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="bg-premium-bg border border-premium-border p-6 rounded-2xl mt-8 text-sm text-premium-text/60 text-center">
        <p>Investment in securities market are subject to market risks. Read all the related documents carefully before investing.</p>
        <p className="mt-2">Registration granted by SEBI, membership of BASL and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.</p>
      </div>
    </div>
  );
}
