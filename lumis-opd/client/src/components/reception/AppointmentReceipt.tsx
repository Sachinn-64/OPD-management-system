import React, { useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { HOSPITAL_INFO } from '../../config/constants';

interface AppointmentReceiptProps {
  appointment: any;
  patient: any;
  doctor: any;
  bill?: any;
  payment?: any;
  onClose: () => void;
}

export const AppointmentReceipt: React.FC<AppointmentReceiptProps> = ({ 
  appointment, 
  patient, 
  doctor,
  bill,
  payment,
  onClose 
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Appointment Receipt</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { 
        font-family: Arial, sans-serif; 
        padding: 20px;
        margin: 0;
      }
      .receipt-container {
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        color: #059669;
      }
      .header p {
        margin: 5px 0;
        color: #666;
      }
      .receipt-title {
        text-align: center;
        background: #f3f4f6;
        padding: 10px;
        margin: 20px 0;
        font-size: 18px;
        font-weight: bold;
      }
      .info-section {
        margin: 20px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .info-label {
        font-weight: 600;
        color: #374151;
      }
      .charges-section {
        margin-top: 30px;
        border: 2px solid #000;
        padding: 15px;
      }
      .charges-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        font-size: 18px;
        font-weight: bold;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #666;
        font-size: 12px;
      }
      @media print {
        .no-print { display: none; }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleDownloadPDF = async () => {
    // Using browser's print to PDF functionality
    handlePrint();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Appointment Receipt</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div ref={receiptRef} className="receipt-container">
            {/* Header */}
            <div className="header">
              <h1>{HOSPITAL_INFO.name}</h1>
              <p>{HOSPITAL_INFO.address}</p>
              <p>Phone: {HOSPITAL_INFO.phone} | Email: {HOSPITAL_INFO.email}</p>
            </div>

            {/* Receipt Title */}
            <div className="receipt-title">
              APPOINTMENT RECEIPT
            </div>

            {/* Receipt Details */}
            <div className="info-section">
              <div className="info-row">
                <span className="info-label">Receipt No:</span>
                <span>APT-{appointment.id?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date & Time:</span>
                <span>{formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}</span>
              </div>
            </div>

            {/* Patient Details */}
            <div className="info-section">
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>Patient Details</h3>
              <div className="info-row">
                <span className="info-label">UHID:</span>
                <span>{patient.uhid}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Patient Name:</span>
                <span>{patient.firstName} {patient.lastName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Mobile:</span>
                <span>{patient.mobile || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Age:</span>
                <span>
                  {patient.dateOfBirth 
                    ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                    : 'N/A'} years
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Gender:</span>
                <span>{patient.gender}</span>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="info-section">
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>Appointment Details</h3>
              <div className="info-row">
                <span className="info-label">Doctor:</span>
                <span>Dr. {doctor.firstName} {doctor.lastName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Specialization:</span>
                <span>{doctor.specialization || 'General Physician'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Appointment Date:</span>
                <span>{formatDate(appointment.appointmentDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Appointment Type:</span>
                <span>{appointment.appointmentType?.replace('_', ' ')}</span>
              </div>
              {appointment.notes && (
                <div className="info-row">
                  <span className="info-label">Notes:</span>
                  <span>{appointment.notes}</span>
                </div>
              )}
            </div>

            {/* Charges */}
            <div className="charges-section">
              <div className="charges-row">
                <span>Consultation Charges:</span>
                <span>₹ {appointment.consultationCharges?.toFixed(2) || '0.00'}</span>
              </div>
              {bill && (
                <>
                  {bill.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                      <span>Discount:</span>
                      <span>- ₹ {bill.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {bill.taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                      <span>Tax:</span>
                      <span>₹ {bill.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div style={{ borderTop: '2px solid #000', marginTop: '10px', paddingTop: '10px' }}>
                <div className="charges-row">
                  <span>Total Amount {payment ? 'Paid' : ''}:</span>
                  <span>₹ {(bill?.totalAmount || appointment.consultationCharges || 0).toFixed(2)}</span>
                </div>
              </div>
              {payment && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Payment Mode:</span>
                    <span style={{ fontWeight: 'bold' }}>{payment.paymentMode}</span>
                  </div>
                  {payment.receiptNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '5px' }}>
                      <span>Receipt No:</span>
                      <span>{payment.receiptNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="footer">
              <p>This is a computer-generated receipt and does not require a signature.</p>
              <p>Thank you for choosing {HOSPITAL_INFO.name}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 no-print">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
