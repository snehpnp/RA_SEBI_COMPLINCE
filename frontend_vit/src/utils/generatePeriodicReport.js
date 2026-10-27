import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

export const generatePeriodicReport = async (data, periodName = 'Current', endDateStr) => {
  try {
    // 1. Fetch the template from the public folder
    const response = await fetch('/templates/Periodic_reporting.xlsx');
    if (!response.ok) throw new Error('Could not load Periodic Report template.');
    const arrayBuffer = await response.arrayBuffer();

    // 2. Read the workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Update 'General Details'
    const ws1 = workbook.getWorksheet('General Details');
    if (ws1) {
      if (endDateStr) {
        const d = new Date(endDateStr);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = months[d.getMonth()];
        const fullFormattedDate = `${monthName} ${d.getDate()}, ${d.getFullYear()}`;
        ws1.getCell('A2').value = `General details of Research Analyst (RA) for the half year ended ${fullFormattedDate} Note: (All fields are mandatory in case if any field not not Applicable, You can mention NA)`;
        ws1.getCell('D2').value = d;
      }

      ws1.getCell('D4').value = data.tenant.companyName || 'NA';
      ws1.getCell('D5').value = data.tenant.companyName || 'NA';
      ws1.getCell('D7').value = data.tenant.sebiRegistration || 'NA';
      
      // DOB / Date of Incorporation
      if (data.tenant.createdAt) {
        const createD = new Date(data.tenant.createdAt);
        ws1.getCell('D10').value = `${createD.getFullYear()}-${String(createD.getMonth() + 1).padStart(2, '0')}-${String(createD.getDate()).padStart(2, '0')}`;
      } else {
        ws1.getCell('D10').value = 'NA';
      }

      // Addresses
      const rawAddress = data.tenant.address || '';
      let addr1 = rawAddress || 'NA';
      let city = 'NA';
      let state = 'NA';
      let pincode = 'NA';

      if (rawAddress && rawAddress.includes(',')) {
        const parts = rawAddress.split(',').map((s) => s.trim());
        if (parts.length >= 3) {
          const lastPart = parts[parts.length - 1];
          if (/\d{6}/.test(lastPart) || !isNaN(Number(lastPart))) {
            pincode = lastPart;
            state = parts[parts.length - 2] || 'NA';
            city = parts[parts.length - 3] || 'NA';
            addr1 = parts.slice(0, parts.length - 3).join(', ') || 'NA';
          } else {
            state = parts[parts.length - 1] || 'NA';
            city = parts[parts.length - 2] || 'NA';
            addr1 = parts.slice(0, parts.length - 2).join(', ') || 'NA';
          }
        }
      }

      // Registered Office
      ws1.getCell('D18').value = addr1;
      ws1.getCell('D20').value = state;
      ws1.getCell('D21').value = city;
      ws1.getCell('D23').value = pincode;

      // Correspondence Address
      ws1.getCell('D26').value = addr1;
      ws1.getCell('D28').value = state;
      ws1.getCell('D29').value = city;
      ws1.getCell('D31').value = pincode;

      // Principal Place
      ws1.getCell('D34').value = addr1;
      ws1.getCell('D36').value = state;
      ws1.getCell('D37').value = city;
      ws1.getCell('D39').value = pincode;

      // Clear dummy address lines and set Country to India
      const dummyRows = [19, 22, 27, 30, 35, 38];
      dummyRows.forEach(r => { ws1.getCell(`D${r}`).value = 'NA'; });
      ws1.getCell('D24').value = 'India';
      ws1.getCell('D32').value = 'India';
      ws1.getCell('D40').value = 'India';
      
      ws1.getCell('D46').value = data.tenant.ownerName || 'NA';
      ws1.getCell('D47').value = 'NA';
      ws1.getCell('D48').value = data.tenant.mobile || 'NA';
      ws1.getCell('D49').value = data.tenant.email || 'NA';

      ws1.getCell('D50').value = 'NA';
      ws1.getCell('D51').value = 'NA';
      ws1.getCell('D52').value = 'NA';
      ws1.getCell('D53').value = 'NA';
      
      // Compliance Officer
      ws1.getCell('D54').value = 'NA';
      ws1.getCell('D55').value = data.staffInfo.complianceOfficer?.name || 'NA';
      ws1.getCell('D56').value = 'NA';
      ws1.getCell('D57').value = data.staffInfo.complianceOfficer?.mobile || 'NA';
      ws1.getCell('D58').value = data.staffInfo.complianceOfficer?.email || 'NA';
      ws1.getCell('D59').value = 'NA';

      // Principal Officer
      ws1.getCell('D60').value = data.staffInfo.principalOfficer?.name || 'NA';
      ws1.getCell('D61').value = 'NA';
      ws1.getCell('D62').value = 'NA';
      ws1.getCell('D63').value = data.staffInfo.principalOfficer?.mobile || 'NA';
      ws1.getCell('D64').value = data.staffInfo.principalOfficer?.email || 'NA';
      ws1.getCell('D65').value = 'NA';
      
      ws1.getCell('D75').value = data.staffInfo.raCount;
      ws1.getCell('D76').value = data.staffInfo.parsCount;
      ws1.getCell('D90').value = data.staffInfo.totalEmployees;
      ws1.getCell('D87').value = data.research.reportsPublished;
    }

    // 4. Update 'Complaints'
    const ws2 = workbook.getWorksheet('Complaints');
    if (ws2) {
      if (endDateStr) {
        const d = new Date(endDateStr);
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        ws2.getCell('A2').value = `Details of the complaints aganist Research Analyst (RA) for the Half Year ended on ${formattedDate}`;
      }

      ws2.getCell('D4').value = 0;
      ws2.getCell('E4').value = data.complaints.pendingStart;
      ws2.getCell('F4').value = data.complaints.pendingStart;

      ws2.getCell('D5').value = 0;
      ws2.getCell('E5').value = data.complaints.received;
      ws2.getCell('F5').value = data.complaints.received;

      ws2.getCell('D6').value = 0;
      ws2.getCell('E6').value = data.complaints.resolved;
      ws2.getCell('F6').value = data.complaints.resolved;

      ws2.getCell('D7').value = 0;
      ws2.getCell('E7').value = data.complaints.pendingEnd;
      ws2.getCell('F7').value = data.complaints.pendingEnd;

      ws2.getCell('D11').value = 0;
      ws2.getCell('E11').value = data.complaints.pendingEnd;
      ws2.getCell('F11').value = data.complaints.pendingEnd;
    }

    // 5. Update 'Clients And Fees'
    const ws3 = workbook.getWorksheet('Clients And Fees');
    if (ws3) {
      if (endDateStr) {
        const d = new Date(endDateStr);
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        ws3.getCell('A2').value = `Details of Clients, Assets under Advice (AUA) and Fees for the half year ended on ${formattedDate}`;
      }

      ws3.getCell('C5').value = data.clientsAndFees.atStart;
      ws3.getCell('I5').value = data.clientsAndFees.atStart;
      
      ws3.getCell('C6').value = data.clientsAndFees.acquired;
      ws3.getCell('I6').value = data.clientsAndFees.acquired;

      ws3.getCell('C7').value = data.clientsAndFees.expired;
      ws3.getCell('I7').value = data.clientsAndFees.expired;

      ws3.getCell('C8').value = data.clientsAndFees.atEnd;
      ws3.getCell('I8').value = data.clientsAndFees.atEnd;

      ws3.getCell('I11').value = data.tenant.depositAmount;

      ws3.getCell('C12').value = data.clientsAndFees.feesCollected;
      ws3.getCell('I12').value = data.clientsAndFees.feesCollected;
    }

    // 6. Update 'Website Details'
    const ws4 = workbook.getWorksheet('Website Details');
    if (ws4) {
      ws4.getCell('B4').value = data.tenant.companyName || 'NA';
      ws4.getCell('C4').value = data.tenant.website || 'NA';
    }

    // Update 'Details Of Social Media'
    const ws5 = workbook.getWorksheet('Details Of Social Media');
    if (ws5) {
      if (data.tenant.socialMediaLinks) {
        try {
          const links = JSON.parse(data.tenant.socialMediaLinks);
          if (Array.isArray(links) && links.length > 0) {
            links.forEach((sm, i) => {
              ws5.getCell('B' + (4 + i)).value = sm.platform || 'NA';
              ws5.getCell('C' + (4 + i)).value = sm.link || 'NA';
            });
          } else {
            ws5.getCell('B4').value = 'NA';
            ws5.getCell('C4').value = 'NA';
          }
        } catch(e) {
          ws5.getCell('B4').value = 'NA';
          ws5.getCell('C4').value = 'NA';
        }
      } else {
        ws5.getCell('B4').value = 'NA';
        ws5.getCell('C4').value = 'NA';
      }
    }

    // Update 'Bank Details'
    const ws6 = workbook.getWorksheet('Bank Details');
    if (ws6) {
      ws6.getCell('B4').value = data.tenant.bankAccountName || data.tenant.companyName || 'NA';
      ws6.getCell('C4').value = data.tenant.bankAccountNo || 'NA';
      ws6.getCell('D4').value = data.tenant.bankAccountType || 'NA';
      ws6.getCell('E4').value = data.tenant.bankIfsc || 'NA';
      ws6.getCell('F4').value = data.tenant.bankName || 'NA';
      ws6.getCell('G4').value = data.tenant.bankBranch || 'NA';
    }

    // 7. Update NISM Certification Details
    const ws7 = workbook.getWorksheet('NISM Certification Details');
    if (ws7) {
      if (data.staffInfo.allStaff && data.staffInfo.allStaff.length > 0) {
        const staff = data.staffInfo.allStaff[0];
        ws7.getCell('B5').value = staff.role || 'NA';
        ws7.getCell('C5').value = staff.name || 'NA';
        ws7.getCell('D5').value = staff.email || 'NA';
        ws7.getCell('E5').value = 'NA';
        ws7.getCell('F5').value = 'NA';
        ws7.getCell('G5').value = staff.nismNumber ? 'NISM' : 'NA';
        ws7.getCell('H5').value = 'NA';
        ws7.getCell('I5').value = 'NA';
      } else {
        ws7.getCell('B5').value = 'NA';
        ws7.getCell('C5').value = 'NA';
        ws7.getCell('D5').value = 'NA';
        ws7.getCell('E5').value = 'NA';
        ws7.getCell('F5').value = 'NA';
        ws7.getCell('G5').value = 'NA';
        ws7.getCell('H5').value = 'NA';
        ws7.getCell('I5').value = 'NA';
      }
    }

    // 8. Trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SEBI_Periodic_Report_${periodName}.xlsx`);

  } catch (error) {
    console.error('Error generating report:', error);
    toast.error('Failed to generate template-based report.');
  }
};
