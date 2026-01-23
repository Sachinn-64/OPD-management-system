import React from 'react';
import { X, Calendar, CreditCard, FileText, CheckCircle, Stethoscope, IndianRupee } from 'lucide-react';

interface PaymentDetailsModalProps {
  appointment: any;
  onClose: () => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ appointment, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const bill = appointment.opdVisit?.bill;
  const payments = bill?.payments || [];
  const hasBill = !!bill;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-50/50 border-b border-emerald-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Appointment Info */}
          <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-emerald-700">Appointment Information</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1">Patient</p>
                <p className="font-semibold text-gray-900">
                  {appointment.patient?.firstName} {appointment.patient?.lastName}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1">UHID</p>
                <p className="font-semibold text-gray-900 font-mono">{appointment.patient?.uhid}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1">Doctor</p>
                <p className="font-semibold text-emerald-700">
                  Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(appointment.appointmentDate)}</p>
              </div>
            </div>
          </div>

          {/* Consultation Charges */}
          <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-blue-700">Consultation Charges</h4>
            </div>
            <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-blue-100">
              <span className="text-gray-600 font-medium">Consultation Fee</span>
              <span className="text-3xl font-bold text-gray-900">
                ₹ {appointment.consultationCharges?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          {/* Bill Information */}
          {hasBill ? (
            <div className="bg-emerald-50/50 rounded-2xl p-5 border-2 border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-emerald-700">Bill Details</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-gray-600">Bill Number</span>
                  <span className="font-bold text-gray-900 font-mono">{bill.billNumber}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-gray-600">Bill Date</span>
                  <span className="font-semibold text-gray-900">{formatDate(bill.billDate)}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-emerald-100">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">₹ {bill.subtotal.toFixed(2)}</span>
                </div>
                {bill.discountAmount > 0 && (
                  <div className="flex justify-between items-center bg-red-50 rounded-xl p-3 border border-red-100">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-semibold text-red-600">- ₹ {bill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {bill.taxAmount > 0 && (
                  <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-emerald-100">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold text-gray-900">₹ {bill.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-gray-700">Total Amount</span>
                  <span className="font-bold text-gray-900 text-xl">₹ {bill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-100 rounded-xl p-3">
                  <span className="font-bold text-emerald-700">Amount Paid</span>
                  <span className="font-bold text-emerald-700 text-xl">₹ {bill.paidAmount.toFixed(2)}</span>
                </div>
                {bill.dueAmount > 0 && (
                  <div className="flex justify-between items-center bg-red-100 rounded-xl p-3">
                    <span className="font-bold text-red-700">Amount Due</span>
                    <span className="font-bold text-red-700 text-xl">₹ {bill.dueAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                      bill.billStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : bill.billStatus === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : bill.billStatus === 'PENDING'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {bill.billStatus}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2.5 rounded-xl">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-700">No Bill Generated</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Bill will be generated after the consultation is completed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-bold text-gray-700">Payment History</h4>
              </div>
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-emerald-100 p-1 rounded-full">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-bold text-gray-900 text-lg">
                            ₹ {payment.amountPaid.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1.5">
                          <p className="flex items-center gap-2">
                            <span className="font-semibold text-gray-500">Mode:</span> 
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-medium">{payment.paymentMode}</span>
                          </p>
                          {payment.receiptNumber && (
                            <p>
                              <span className="font-semibold text-gray-500">Receipt:</span> {payment.receiptNumber}
                            </p>
                          )}
                          {payment.paymentRef && (
                            <p>
                              <span className="font-semibold text-gray-500">Reference:</span> {payment.paymentRef}
                            </p>
                          )}
                          {payment.remarks && (
                            <p>
                              <span className="font-semibold text-gray-500">Remarks:</span> {payment.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                        <p>{formatTime(payment.paymentDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-emerald-100 px-6 py-4 bg-emerald-50/30">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-emerald-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
