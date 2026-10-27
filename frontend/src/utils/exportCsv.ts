import { toast } from 'react-hot-toast';
import { executeSmartDownload } from './smartDownload';

export async function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    toast('No data available to export.');
    return;
  }
  
  // Extract headers
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Push header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
  
  // Push data rows
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      }
      
      // If the value is an object or array, stringify it or format it
      if (typeof val === 'object') {
        try {
           val = JSON.stringify(val);
        } catch(e) {
           val = String(val);
        }
      } else {
        val = String(val);
      }
      
      // Escape double quotes inside the string and wrap in double quotes
      val = `"${val.replace(/"/g, '""')}"`;
      return val;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const resolvedFileName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  await executeSmartDownload({
    blob,
    fileName: resolvedFileName,
    documentType: `${filename.replace(/_/g, ' ')} Export`
  });
}
