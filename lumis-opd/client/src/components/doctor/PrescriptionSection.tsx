import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Pill, Save, FolderOpen, X, FileText, Edit2, Loader2, History, Calendar, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { consultationService, PrescriptionTemplate, TemplateItem } from '../../services/consultationService';
import { PrescriptionPrint } from './PrescriptionPrint';

interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage?: string;
  frequency: string;
  timing: string;
  durationDays: number;
}

interface PrescriptionSectionProps {
  visitId: string;
  patientId?: string;
  initialItems?: PrescriptionItem[];
  onSave?: (items: PrescriptionItem[]) => void;
  assessment?: string;
  followUp?: string;
  generalAdvice?: string;
  dietaryAdvice?: string;
  activityAdvice?: string;
}

export const PrescriptionSection: React.FC<PrescriptionSectionProps> = ({ visitId: _visitId, patientId, initialItems, onSave, assessment, followUp, generalAdvice, dietaryAdvice, activityAdvice }) => {
  const [items, setItems] = useState<PrescriptionItem[]>(
    initialItems || [{ id: Date.now().toString(), drugName: '', dosage: '', frequency: '', timing: '', durationDays: 30 }]
  );

  // Track if initial items have been loaded to avoid infinite loops
  const initialItemsLoadedRef = useRef(false);

  // Sync items when initialItems changes (e.g., when loading completed visit data)
  useEffect(() => {
    // Only update if initialItems has content OR we need to reset to empty state
    const hasInitialItems = initialItems && initialItems.length > 0;

    if (hasInitialItems) {
      setItems(initialItems);
      initialItemsLoadedRef.current = true;
    } else if (initialItemsLoadedRef.current) {
      // Reset to empty state when switching to a new patient
      setItems([{ id: Date.now().toString(), drugName: '', dosage: '', frequency: '', timing: '', durationDays: 30 }]);
      initialItemsLoadedRef.current = false;
    }
  }, [initialItems]);

  // Template state
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLanguage, setPrintLanguage] = useState<'en' | 'hi' | 'mr' | 'kn'>('en');

  // Print section visibility toggles (default checked sections)
  const [printSections, setPrintSections] = useState({
    chiefComplaint: true,
    vitals: true,
    prescription: true,
    assessment: true,
    advice: true,
    followUp: true,
    diagnosis: false,
    history: false,
  });

  // Previous prescriptions state
  const [showPreviousModal, setShowPreviousModal] = useState(false);
  const [previousPrescriptions, setPreviousPrescriptions] = useState<any[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [previousPage, setPreviousPage] = useState(1);
  const previousLimit = 5;

  const handlePrint = () => {
    setShowPrintModal(false);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Load templates from API on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const data = await consultationService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Load previous prescriptions for this patient
  const loadPreviousPrescriptions = async () => {
    if (!patientId) return;
    setIsLoadingPrevious(true);
    try {
      const response = await consultationService.getPrescriptionsByPatient(patientId, previousPage, previousLimit);
      // Response may be array or object with data property - handle both
      const prescrList = Array.isArray(response) ? response : ((response as any)?.data || []);
      setPreviousPrescriptions(prescrList);
    } catch (error) {
      console.error('Failed to load previous prescriptions:', error);
      setPreviousPrescriptions([]);
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  // Load when modal opens
  useEffect(() => {
    if (showPreviousModal && patientId) {
      loadPreviousPrescriptions();
    }
  }, [showPreviousModal, previousPage, patientId]);

  // Apply previous prescription items
  const applyPreviousPrescription = (prescription: any) => {
    if (!prescription.items || prescription.items.length === 0) return;

    const mappedItems = prescription.items.map((item: any, index: number) => ({
      id: `prev-${Date.now()}-${index}`,
      drugName: item.drugName || '',
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      timing: item.beforeAfterFood || item.timing || '',
      durationDays: item.durationDays || 30,
    }));

    setItems(mappedItems);
    onSave?.(mappedItems);
    setShowPreviousModal(false);
  };

  const addItem = () => {
    const newItem: PrescriptionItem = {
      id: Date.now().toString(),
      drugName: '',
      dosage: '',
      frequency: '',
      timing: '',
      durationDays: 30,
    };
    const updated = [...items, newItem];
    setItems(updated);
    onSave?.(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    onSave?.(updated);
  };

  const updateItem = (id: string, field: keyof PrescriptionItem, value: any) => {
    const updated = items.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    setItems(updated);
    onSave?.(updated);
  };

  // Apply a template - adds template items to current prescription
  const applyTemplate = (template: PrescriptionTemplate) => {
    const newItems = template.items.map((item, index) => ({
      ...item,
      id: `${Date.now()}-${index}`,
      timing: item.timing || '',
    }));

    // Filter out empty items from current list before adding template items
    const nonEmptyItems = items.filter(item => item.drugName.trim() !== '');
    const updated = [...nonEmptyItems, ...newItems];

    setItems(updated);
    onSave?.(updated);
    setShowTemplateModal(false);
  };

  // Save current prescription as a template
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const validItems = items.filter(item => item.drugName.trim() !== '');
    if (validItems.length === 0) {
      alert('Add at least one medication before saving as template');
      return;
    }

    const templateItems: TemplateItem[] = validItems.map(({ id: _id, ...rest }) => ({
      drugName: rest.drugName,
      dosage: rest.dosage,
      frequency: rest.frequency,
      timing: rest.timing || undefined,
      durationDays: rest.durationDays,
    }));

    setIsSavingTemplate(true);
    try {
      if (editingTemplate) {
        // Update existing template
        await consultationService.updateTemplate(editingTemplate.id, {
          name: newTemplateName,
          items: templateItems,
        });
      } else {
        // Create new template
        await consultationService.createTemplate({
          name: newTemplateName,
          items: templateItems,
        });
      }

      // Reload templates
      await loadTemplates();

      setShowSaveTemplateModal(false);
      setNewTemplateName('');
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Delete a template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await consultationService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  // Edit a template
  const startEditTemplate = (template: PrescriptionTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    // Load template items into the form
    const templateItems = template.items.map((item, index) => ({
      ...item,
      id: `${Date.now()}-${index}`,
      timing: item.timing || '',
      dosage: item.dosage || '',
    }));
    setItems(templateItems);
    onSave?.(templateItems);
    setShowTemplateModal(false);
    setShowSaveTemplateModal(true);
  };

  const frequencyPresets = [
    '1-0-0',
    '0-0-1',
    '1-0-1',
    '1-1-1',
    '1-1-1-1',
    '2-2-2',
    '2-2-2-2',
    '1/2-1/2-1/2',
    '1/2-1/2-1/2-1/2',
    'SOS',
    'Stat',
  ];

  const timingOptions = [
    { label: 'Before Food', value: 'Before Food' },
    { label: 'After Food', value: 'After Food' },
    { label: 'With Food', value: 'With Food' },
    { label: 'Empty Stomach', value: 'Empty Stomach' },
    { label: 'At Bedtime', value: 'At Bedtime' },
    { label: 'Any Time', value: 'Any Time' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with template buttons */}
      <div className="flex items-center justify-between">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex-1 mr-3">
          <p className="text-xs text-emerald-800">
            💊 All prescriptions will be saved when you click 'Complete Consultation' button
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => patientId && setShowPreviousModal(true)}
            disabled={!patientId}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <History className="w-4 h-4" />
            Load Previous
          </button>
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            Templates
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setNewTemplateName('');
              setShowSaveTemplateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 transition-all"
          >
            <Save className="w-4 h-4" />
            Save as Template
          </button>
        </div>
      </div>

      {/* Quick template buttons if templates exist */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center mr-1">Quick apply:</span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium hover:bg-emerald-100 transition-all"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-bold text-gray-900">Medication {index + 1}</h4>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-all"
                title="Remove medication"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Drug Name
                </label>
                <input
                  type="text"
                  value={item.drugName}
                  onChange={(e) => updateItem(item.id, 'drugName', e.target.value)}
                  placeholder="e.g., Paracetamol"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Dosage <span className="text-gray-400 font-normal text-sm">(optional)</span>
                </label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => updateItem(item.id, 'dosage', e.target.value)}
                  placeholder="e.g., 500mg or leave empty if in drug name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Frequency
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={item.frequency}
                    onChange={(e) => updateItem(item.id, 'frequency', e.target.value)}
                    placeholder="e.g., 1-1-1 or 1-1-2-1"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {frequencyPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateItem(item.id, 'frequency', preset)}
                        className={`px-2 py-1 text-xs rounded border transition-all ${item.frequency === preset
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-400'
                          }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Instructions
                </label>
                <select
                  value={item.timing}
                  onChange={(e) => updateItem(item.id, 'timing', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select timing</option>
                  {timingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  value={item.durationDays}
                  onChange={(e) => updateItem(item.id, 'durationDays', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 7"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Medication Button */}
      <button
        type="button"
        onClick={addItem}
        className="group w-full relative overflow-hidden flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-base font-semibold hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <div className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
          <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-white/20 transition-colors duration-300">
            <Plus className="w-5 h-5" />
          </div>
          <span>Add Medication</span>
        </div>
      </button>

      {/* Print Language Selection Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Print Options</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Toggles */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Sections to Print</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'chiefComplaint', label: 'Chief Complaint' },
                  { key: 'vitals', label: 'Vitals' },
                  { key: 'prescription', label: 'Prescription' },
                  { key: 'assessment', label: 'Assessment' },
                  { key: 'advice', label: 'Advice' },
                  { key: 'followUp', label: 'Follow Up' },
                  { key: 'diagnosis', label: 'Diagnosis' },
                  { key: 'history', label: 'History' },
                ].map((section) => (
                  <label
                    key={section.key}
                    className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={printSections[section.key as keyof typeof printSections]}
                      onChange={(e) => setPrintSections(prev => ({ ...prev, [section.key]: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{section.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Print Language</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'Hindi (हिंदी)' },
                  { code: 'mr', label: 'Marathi (मराठी)' },
                  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' }
                ].map((lang) => (
                  <label
                    key={lang.code}
                    className={`flex items-center p-2 border rounded-lg cursor-pointer transition-all ${printLanguage === lang.code
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="printLanguage"
                      checked={printLanguage === lang.code}
                      onChange={() => setPrintLanguage(lang.code as any)}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{lang.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                <Printer className="w-4 h-4" />
                Print Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrinting && createPortal(
        <div id="print-portal">
          <PrescriptionPrint
            items={printSections.prescription ? items : []}
            assessment={printSections.assessment ? assessment : undefined}
            followUp={printSections.followUp ? followUp : undefined}
            printLanguage={printLanguage}
            generalAdvice={printSections.advice ? generalAdvice : undefined}
            dietaryAdvice={printSections.advice ? dietaryAdvice : undefined}
            activityAdvice={printSections.advice ? activityAdvice : undefined}
            showSections={printSections}
          />
        </div>,
        document.body
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-60" style={{ position: 'fixed' }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Prescription Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {isLoadingTemplates ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-500 animate-spin" />
                  <p className="text-gray-500">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No templates yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first template by adding medications and clicking "Save as Template"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{template.name}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditTemplate(template)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {template.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 py-1">
                            <Pill className="w-3 h-3 text-emerald-500" />
                            <span>{item.drugName} {item.dosage} - {item.frequency}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all"
                      >
                        Apply Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-60" style={{ position: 'fixed' }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-600" />
                {editingTemplate ? 'Update Template' : 'Save as Template'}
              </h3>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setEditingTemplate(null);
                  setNewTemplateName('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Hypertension, Diabetes, Fever..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Medications to be saved:</p>
                {items.filter(i => i.drugName.trim()).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No medications added yet</p>
                ) : (
                  <div className="space-y-1">
                    {items.filter(i => i.drugName.trim()).map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <Pill className="w-3 h-3 text-emerald-500" />
                        {item.drugName} {item.dosage} - {item.frequency} ({item.timing || 'Any Time'}) × {item.durationDays} days
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setEditingTemplate(null);
                    setNewTemplateName('');
                  }}
                  disabled={isSavingTemplate}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsTemplate}
                  disabled={isSavingTemplate}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Prescriptions Modal */}
      {showPreviousModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-gray-900">Previous Prescriptions</span>
              </div>
              <button
                onClick={() => setShowPreviousModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingPrevious ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  <span className="ml-2 text-gray-600">Loading previous prescriptions...</span>
                </div>
              ) : previousPrescriptions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No previous prescriptions found</p>
                  <p className="text-sm mt-1">This patient has no prior prescription records.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previousPrescriptions.map((prescription: any) => (
                    <div
                      key={prescription.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-amber-300 hover:bg-amber-50/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {prescription.opdVisit?.visitDate
                              ? new Date(prescription.opdVisit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : new Date(prescription.prescribedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            }
                          </span>
                        </div>
                        <button
                          onClick={() => applyPreviousPrescription(prescription)}
                          disabled={!prescription.items || prescription.items.length === 0}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>

                      {prescription.items && prescription.items.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          {prescription.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <Pill className="w-3 h-3 text-emerald-500" />
                              <span>{item.drugName}</span>
                              {item.dosage && <span className="text-gray-400">• {item.dosage}</span>}
                              <span className="text-gray-400">• {item.frequency}</span>
                              <span className="text-gray-400">• {item.durationDays} days</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-2">No medicines added</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {previousPrescriptions.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => setPreviousPage(p => Math.max(1, p - 1))}
                  disabled={previousPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {previousPage}</span>
                <button
                  onClick={() => setPreviousPage(p => p + 1)}
                  disabled={previousPrescriptions.length < previousLimit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
