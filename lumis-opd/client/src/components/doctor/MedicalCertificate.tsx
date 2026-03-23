import React, { useState, useRef, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  Award,
  Download,
  Printer,
  Save,
  Trash2,
  FolderOpen,
  X,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';

// ─── Types ────────────────────────────────────────────────────────
interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  uhid: string;
}

interface CertificateTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface MedicalCertificateProps {
  /** If provided the patient fields are pre-filled */
  patient?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    uhid?: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────
const TEMPLATES_KEY = 'lumis_cert_templates';

const loadTemplates = (): CertificateTemplate[] => {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveTemplates = (templates: CertificateTemplate[]) => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

const calculateAge = (dob: string): string => {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
};

// ─── Component ────────────────────────────────────────────────────
export const MedicalCertificate: React.FC<MedicalCertificateProps> = ({ patient }) => {
  // Patient info
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    age: '',
    gender: '',
    uhid: '',
  });
  const [showPatientFields, setShowPatientFields] = useState(true);

  // Canvas content
  const editorRef = useRef<HTMLDivElement>(null);

  // Templates
  const [templates, setTemplates] = useState<CertificateTemplate[]>(loadTemplates);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Pre-fill patient info when patient prop changes
  useEffect(() => {
    if (patient) {
      setPatientInfo({
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : '',
        gender: patient.gender || '',
        uhid: patient.uhid || '',
      });
    } else {
      setPatientInfo({ name: '', age: '', gender: '', uhid: '' });
    }
  }, [patient]);

  // ── Template actions ──────────────────────────────────────────
  const handleSaveTemplate = useCallback(() => {
    const name = newTemplateName.trim();
    if (!name) return;
    const content = editorRef.current?.innerHTML || '';
    if (!content.trim()) return;

    const t: CertificateTemplate = {
      id: crypto.randomUUID(),
      name,
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = [t, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setNewTemplateName('');
    setShowSaveDialog(false);
  }, [newTemplateName, templates]);

  const handleLoadTemplate = useCallback((template: CertificateTemplate) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
    }
    setShowTemplatePanel(false);
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  }, [templates]);

  // ── Clear canvas ──────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, []);

  // ── Generate PDF ──────────────────────────────────────────────
  const handleDownloadPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    const centerText = (text: string, y: number, fontSize = 12) => {
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(text);
      doc.text(text, (pageWidth - w) / 2, y);
    };

    // ── Leave blank space at top for hospital letterpad ──
    let yPos = 55; // generous top margin

    // Title
    doc.setFont('helvetica', 'bold');
    centerText('Medical Certificate', yPos, 16);
    yPos += 12;

    // Thin line
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, margin, yPos);
    yPos += 10;

    // Patient info (if filled)
    const { name, age, gender, uhid } = patientInfo;
    if (name || age || gender || uhid) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Patient Details:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const parts: string[] = [];
      if (name) parts.push(`Name: ${name}`);
      if (age) parts.push(`Age: ${age} years`);
      if (gender) parts.push(`Gender: ${gender}`);
      if (uhid) parts.push(`UHID: ${uhid}`);
      doc.text(parts.join('   |   '), margin, yPos);
      yPos += 12;
    }

    // Canvas content
    const rawHTML = editorRef.current?.innerHTML || '';
    // Strip HTML tags to get plain text for PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHTML;
    const plainText = tempDiv.innerText || tempDiv.textContent || '';

    if (plainText.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(plainText, pageWidth - 2 * margin);

      for (const line of lines) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      }
    }

    // Signature area
    yPos = Math.max(yPos + 30, 220);
    if (yPos > 260) {
      doc.addPage();
      yPos = 60;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.line(pageWidth - 75, yPos - 2, pageWidth - margin, yPos - 2);
    doc.text("Doctor's Signature", pageWidth - 75, yPos + 5);

    // Save
    const fileName = `medical_certificate_${name ? name.replace(/\s+/g, '_') : 'patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }, [patientInfo]);

  // ── Browser Print ─────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const content = editorRef.current?.innerHTML || '';
    const { name, age, gender, uhid } = patientInfo;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Certificate</title>
        <style>
          @page { margin: 20mm 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            padding: 0;
            margin: 0;
          }
          .letterpad-space { height: 60mm; }
          .title {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .divider {
            border: none;
            border-top: 1px solid #ccc;
            margin: 8px 0 16px;
          }
          .date { font-size: 12px; color: #555; margin-bottom: 12px; }
          .patient-details {
            font-size: 13px;
            margin-bottom: 16px;
            padding: 8px 12px;
            background: #f7f7f7;
            border-radius: 4px;
          }
          .patient-details strong { color: #333; }
          .content { font-size: 14px; white-space: pre-wrap; }
          .signature {
            margin-top: 60px;
            text-align: right;
            padding-right: 20px;
          }
          .signature .line {
            display: inline-block;
            width: 180px;
            border-top: 1px solid #333;
            padding-top: 4px;
            font-size: 12px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="letterpad-space"></div>
        <div class="title">Medical Certificate</div>
        <hr class="divider" />
        <div class="date">Date: ${new Date().toLocaleDateString('en-IN')}</div>
        ${(name || age || gender || uhid) ? `
          <div class="patient-details">
            ${name ? `<strong>Name:</strong> ${name}&emsp;` : ''}
            ${age ? `<strong>Age:</strong> ${age} years&emsp;` : ''}
            ${gender ? `<strong>Gender:</strong> ${gender}&emsp;` : ''}
            ${uhid ? `<strong>UHID:</strong> ${uhid}` : ''}
          </div>
        ` : ''}
        <div class="content">${content}</div>
        <div class="signature">
          <div class="line">Doctor's Signature</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }, [patientInfo]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 mr-auto">
          <Award className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-800 text-sm">Medical Certificate</span>
        </div>

        {/* Template actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplatePanel(!showTemplatePanel)}
          className="text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          <FolderOpen className="w-3.5 h-3.5 mr-1" />
          Templates
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save as Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-xs border-red-300 text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="text-xs border-slate-400 text-slate-600 hover:bg-slate-50"
        >
          <Printer className="w-3.5 h-3.5 mr-1" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          className="text-xs border-blue-400 text-blue-600 hover:bg-blue-50"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          PDF
        </Button>
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="text"
            placeholder="Template name..."
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            autoFocus
          />
          <Button variant="primary" size="sm" onClick={handleSaveTemplate} className="text-xs bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-3.5 h-3.5 mr-1" />
            Save
          </Button>
          <button onClick={() => setShowSaveDialog(false)} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Template Panel */}
      {showTemplatePanel && (
        <div className="bg-white border border-purple-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-purple-800">Saved Templates</span>
            <button onClick={() => setShowTemplatePanel(false)} className="text-purple-400 hover:text-purple-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                No templates saved yet. Write content and click "Save as Template".
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 hover:bg-purple-50/50 transition-colors last:border-b-0"
                >
                  <button
                    onClick={() => handleLoadTemplate(t)}
                    className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-purple-700 transition-colors"
                  >
                    {t.name}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 ml-2"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Patient Info (collapsible) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPatientFields(!showPatientFields)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Patient Details {patient ? '(Auto-filled)' : '(Optional)'}
          </span>
          {showPatientFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPatientFields && (
          <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 pt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Patient Name</label>
              <input
                type="text"
                value={patientInfo.name}
                onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Age</label>
              <input
                type="text"
                value={patientInfo.age}
                onChange={(e) => setPatientInfo((p) => ({ ...p, age: e.target.value }))}
                placeholder="e.g. 35"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
              <select
                value={patientInfo.gender}
                onChange={(e) => setPatientInfo((p) => ({ ...p, gender: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">UHID</label>
              <input
                type="text"
                value={patientInfo.uhid}
                onChange={(e) => setPatientInfo((p) => ({ ...p, uhid: e.target.value }))}
                placeholder="e.g. UH-0001"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Letterpad blank space */}
        <div className="h-16 bg-gradient-to-b from-gray-50 to-white border-b border-dashed border-gray-200 flex items-end justify-center pb-1">
          <span className="text-[10px] text-gray-300 italic select-none">↑ Hospital Letterpad Area ↑</span>
        </div>

        {/* Title */}
        <div className="text-center py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 tracking-wide">Medical Certificate</h2>
        </div>

        {/* Editable canvas */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[400px] px-6 py-5 text-sm text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-purple-200 focus:ring-inset transition-shadow"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          data-placeholder="Start typing here... Write any medical certificate content as needed."
          onFocus={(e) => {
            if (!e.currentTarget.textContent?.trim()) {
              e.currentTarget.classList.add('empty-canvas');
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            if (el.textContent?.trim()) {
              el.classList.remove('empty-canvas');
            } else {
              el.classList.add('empty-canvas');
            }
          }}
        />
      </div>

      {/* Inline styles for the placeholder */}
      <style>{`
        [contenteditable][data-placeholder]:empty::before,
        [contenteditable][data-placeholder].empty-canvas::before {
          content: attr(data-placeholder);
          color: #c4b5d0;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
