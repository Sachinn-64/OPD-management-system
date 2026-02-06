import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MedicineForm, FORM_CONFIGS } from '../../config/prescriptionConfig';

interface FormSelectorModalProps {
  isOpen: boolean;
  medicineName: string;
  onSelect: (form: MedicineForm, content: string) => void;
  onCancel: () => void;
}

export const FormSelectorModal: React.FC<FormSelectorModalProps> = ({
  isOpen,
  medicineName,
  onSelect,
  onCancel,
}) => {
  const [selectedForm, setSelectedForm] = useState<MedicineForm | null>(null);
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedForm) {
      alert('Please select a medicine form');
      return;
    }
    if (!content.trim()) {
      alert('Please enter the content/strength');
      return;
    }
    onSelect(selectedForm, content.trim());
    // Reset
    setSelectedForm(null);
    setContent('');
  };

  const handleCancel = () => {
    setSelectedForm(null);
    setContent('');
    onCancel();
  };

  const formTypes: MedicineForm[] = ['TAB', 'CAP', 'SYP', 'INJ', 'CREAM', 'GEL', 'DROPS', 'POWDER'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Select Medicine Form</h3>
            <p className="text-sm text-gray-600 mt-1">Medicine: <span className="font-semibold text-emerald-700">{medicineName}</span></p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Form Type Selection */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-3">
              Select Medicine Form Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {formTypes.map((formType) => {
                const config = FORM_CONFIGS[formType];
                const isSelected = selectedForm === formType;
                
                return (
                  <button
                    key={formType}
                    type="button"
                    onClick={() => setSelectedForm(formType)}
                    className={`
                      relative flex flex-col items-center justify-center p-4 rounded-xl border-2 
                      transition-all duration-200 hover:scale-105
                      ${isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                      }
                    `}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="text-4xl mb-2">{config.icon}</div>
                    <div className={`text-sm font-semibold ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {config.label.en}
                    </div>
                    <div className={`text-xs ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {formType}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content/Strength Input */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              Content / Strength <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={selectedForm ? FORM_CONFIGS[selectedForm].contentPlaceholder.en : 'Select form type first...'}
              disabled={!selectedForm}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base 
                       focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       transition-all"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Examples: 500mg, 100ml, 1mg/ml, 5gm, 15g, etc.
            </p>
          </div>

          {/* Helper text */}
          {selectedForm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                <span className="font-semibold">💊 {FORM_CONFIGS[selectedForm].label.en}:</span>
                {' '}This will show {FORM_CONFIGS[selectedForm].label.en.toLowerCase()}-specific dosing options 
                like {FORM_CONFIGS[selectedForm].frequencies[0]?.en || 'appropriate frequencies'}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-base font-medium 
                     hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedForm || !content.trim()}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-base font-semibold 
                     hover:bg-emerald-700 transition-all
                     disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300
                     flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
