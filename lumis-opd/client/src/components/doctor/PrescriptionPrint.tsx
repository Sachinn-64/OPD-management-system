import { forwardRef } from 'react';
import { useConsultationStore } from '../../store/consultationStore';
import { FORM_CONFIGS } from '../../config/prescriptionConfig';

interface PrescriptionItem {
  id: string;
  drugName: string;
  genericName?: string;
  /** Item type (Tablet, Capsule, Injection, etc.) */
  itemType?: string;
  /** Form code (TAB, CAP, SYP, etc.) for fallback display */
  form?: keyof typeof FORM_CONFIGS;
  dosage?: string;
  frequency: string;
  timing: string;
  durationDays: number;
}

interface VitalsInfo {
  heartRate?: string;
  bloodPressure?: string;
  systolicBP?: string;
  diastolicBP?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  bsa?: string;
  eGFR?: string;
}

interface DoctorInfo {
  name?: string;
  specialty?: string;
  registrationNo?: string;
}

interface DiagnosisInfo {
  id: string;
  type: 'PROVISIONAL' | 'FINAL' | 'DIFFERENTIAL';
  icdCode?: string;
  diagnosisText: string;
}

interface HistoryInfo {
  presentIllness?: string;
  pastMedical?: string;
  family?: string;
  allergies?: string;
  addiction?: string;
}

interface PrescriptionPrintProps {
  items: PrescriptionItem[];
  assessment?: string;
  followUp?: string;
  printLanguage: 'en' | 'hi' | 'mr' | 'kn';
  generalAdvice?: string;
  dietaryAdvice?: string;
  activityAdvice?: string;
  chiefComplaint?: string;
  vitals?: VitalsInfo;
  doctorInfo?: DoctorInfo;
  diagnoses?: DiagnosisInfo[];
  history?: HistoryInfo;
  showSections?: {
    chiefComplaint: boolean;
    vitals: boolean;
    prescription: boolean;
    assessment: boolean;
    advice: boolean;
    followUp: boolean;
    diagnosis: boolean;
    history: boolean;
  };
}

export const PrescriptionPrint = forwardRef<HTMLDivElement, PrescriptionPrintProps>(({ items, assessment, followUp, printLanguage, generalAdvice, dietaryAdvice, activityAdvice, chiefComplaint, vitals, doctorInfo, showSections, diagnoses, history }, ref) => {
  const { currentPatient } = useConsultationStore();

  const calculateAge = (dobString?: string) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  const getTranslatedTiming = (timing: string) => {
    const translations: Record<string, { hi: string; mr: string; kn: string }> = {
      'Before Food': { hi: 'खाने से पहले', mr: 'जेवणापूर्वी', kn: 'ಊಟಕ್ಕೆ ಮುಂಚೆ' },
      'After Food': { hi: 'खाने के बाद', mr: 'जेवणानंतर', kn: 'ಊಟದ ನಂತರ' },
      'With Food': { hi: 'खाने के साथ', mr: 'जेवणासोबत', kn: 'ಊಟದ ಜೊತೆ' },
      'Empty Stomach': { hi: 'खाली पेट', mr: 'रिकाम्या पोटी', kn: 'ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ' },
      'At Bedtime': { hi: 'सोते समय', mr: 'झोपताना', kn: 'ಮಲಗುವ ಸಮಯ' },
      'Any Time': { hi: 'कभी भी', mr: 'कधीही', kn: 'ಯಾವುದೇ ಸಮಯ' },
    };

    if (printLanguage === 'en') return null;

    const translation = translations[timing];
    if (translation) {
      return translation[printLanguage as 'hi' | 'mr' | 'kn'];
    }

    return null;
  };

  const getTranslatedFrequency = (freq: string) => {
    if (printLanguage === 'en' || !freq) return null;

    // First, try to find exact match in FORM_CONFIGS
    for (const formConfig of Object.values(FORM_CONFIGS)) {
      const match = formConfig.frequencies.find(f => f.value === freq);
      if (match) {
        return match[printLanguage as 'hi' | 'mr' | 'kn'];
      }
    }

    // Fallback to pattern matching for M-A-N format
    const pattern = /^([0-9./]+)(?:\s*[-\s]\s*)([0-9./]+)(?:\s*[-\s]\s*)([0-9./]+)(?:(?:\s*[-\s]\s*)([0-9./]+))?$/;

    const cleanFreq = freq.trim();
    const match = cleanFreq.match(pattern);

    if (match) {
      const parts = match.slice(1).filter(p => p !== undefined);

      const timeMap = {
        hi: ['सुबह', 'दोपहर', 'शाम', 'रात'],
        mr: ['सकाळी', 'दुपारी', 'संध्याकाळी', 'रात्री'],
        kn: ['ಬೆಳಿಗ್ಗೆ', 'ಮಧ್ಯಾಹ್ನ', 'ಸಂಜೆ', 'ರಾತ್ರಿ']
      };

      const currentLangTimes = timeMap[printLanguage as 'hi' | 'mr' | 'kn'];
      const resultParts: string[] = [];

      if (parts.length === 3) {
        // Format: M-A-N (morning, afternoon, night)
        const [m, a, n] = parts;
        if (m !== '0') resultParts.push(currentLangTimes[0]);
        if (a !== '0') resultParts.push(currentLangTimes[1]);
        if (n !== '0') resultParts.push(currentLangTimes[3]); // Night is index 3
      }
      else if (parts.length === 4) {
        // Format: M-A-E-N (morning, afternoon, evening, night)
        parts.forEach((val, idx) => {
          if (val !== '0') resultParts.push(currentLangTimes[idx]);
        });
      }

      if (resultParts.length > 0) return resultParts.join(' - ');
    }

    // Fallback to normalized keyword translations
    const normalizedFreq = cleanFreq.replace(/\s+/g, '').toLowerCase();

    const translations: Record<string, { hi: string; mr: string; kn: string }> = {
      'oncedaily': { hi: 'दिन में एक बार', mr: 'दिवसातून एकदा', kn: 'ದಿನಕ್ಕೊಮ್ಮೆ' },
      'twicedaily': { hi: 'दिन में दो बार', mr: 'दिवसातून दोनदा', kn: 'ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ' },
      'threetimesdaily': { hi: 'दिन में तीन बार', mr: 'दिवसातून तीनदा', kn: 'ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ' },
      'fourtimesdaily': { hi: 'दिन में चार बार', mr: 'दिवसातून चार वेळा', kn: 'ದಿನಕ್ಕೆ ನಾಲ್ಕು ಬಾರಿ' },
      'every4hours': { hi: 'हर 4 घंटे में', mr: 'दर 4 तासांनी', kn: 'ಪ್ರತಿ 4 ಗಂಟೆಗಳಿಗೊಮ್ಮೆ' },
      'every6hours': { hi: 'हर 6 घंटे में', mr: 'दर 6 तासांनी', kn: 'ಪ್ರತಿ 6 ಗಂಟೆಗಳಿಗೊಮ್ಮೆ' },
      'every8hours': { hi: 'हर 8 घंटे में', mr: 'दर 8 तासांनी', kn: 'ಪ್ರತಿ 8 ಗಂಟೆಗಳಿಗೊಮ್ಮೆ' },
      'every12hours': { hi: 'हर 12 घंटे में', mr: 'दर 12 तासांनी', kn: 'ಪ್ರತಿ 12 ಗಂಟೆಗಳಿಗೊಮ್ಮೆ' },
      'asneeded': { hi: 'ज़रूरत पड़ने पर', mr: 'गरज असल्यास', kn: 'ಅಗತ್ಯವಿದ್ದರೆ' },
      'sos': { hi: 'ज़रूरत पड़ने पर', mr: 'गरज असल्यास', kn: 'ಅಗತ್ಯವಿದ್ದರೆ' },
      'stat': { hi: 'तत्काल', mr: 'ताबडतोब', kn: 'ತಕ್ಷಣ' },
      'beforemeals': { hi: 'खाने से पहले', mr: 'जेवणापूर्वी', kn: 'ಊಟಕ್ಕೆ ಮುಂಚೆ' },
      'aftermeals': { hi: 'खाने के बाद', mr: 'जेवणानंतर', kn: 'ಊಟದ ನಂತರ' },
      'atbedtime': { hi: 'सोते समय', mr: 'झोपताना', kn: 'ಮಲಗುವ ಸಮಯ' },
    };

    if (translations[normalizedFreq]) {
      return translations[normalizedFreq][printLanguage as 'hi' | 'mr' | 'kn'];
    }

    return null;
  };

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Always return English - no label translations
  // Translation is ONLY for dose values (1-1-1) and instruction values (After Food)
  const t = (_key: string, defaultText: string) => {
    return defaultText;
  };

  // Build full address - use type casting for optional patient fields
  const buildAddress = () => {
    const p = currentPatient as any;
    const parts = [];
    if (p?.addressLine1) parts.push(p.addressLine1);
    if (p?.addressLine2) parts.push(p.addressLine2);
    if (p?.city) parts.push(p.city);
    if (p?.state) parts.push(p.state);
    if (p?.pincode) parts.push(p.pincode);
    return parts.join(', ') || (p?.address || 'N/A');
  };

  const hasAdvice = (showSections?.advice !== false) && (generalAdvice || dietaryAdvice || activityAdvice);
  const hasVitals = (showSections?.vitals !== false) && vitals && (vitals.heartRate || vitals.bloodPressure || vitals.oxygenSaturation || vitals.weight || vitals.height || vitals.bsa || vitals.eGFR);
  const showChiefComplaint = (showSections?.chiefComplaint !== false) && chiefComplaint;
  const showAssessment = (showSections?.assessment !== false) && assessment;
  const showFollowUp = (showSections?.followUp !== false) && followUp;
  const showPrescription = (showSections?.prescription !== false) && items.length > 0;
  const showDiagnosis = (showSections?.diagnosis === true) && diagnoses && diagnoses.length > 0;
  const showHistory = (showSections?.history === true) && history && (history.presentIllness || history.pastMedical || history.family || history.allergies || history.addiction);
  const p = currentPatient as any; // For optional fields

  return (
    <>
      {/* Print-specific styles */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            
            /* Repeating header on every printed page - same formatting as first page */
            .prescription-print-header {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              z-index: 9999 !important;
              background: white !important;
              padding: 12px 25px 10px !important;
              border-bottom: 1px solid #999 !important;
              font-size: 13px !important;
              box-sizing: border-box !important;
            }
            
            .prescription-print-container {
              padding-top: 140px !important;    /* Space for fixed header on every page */
              padding-bottom: 50px !important;
              padding-left: 25px !important;
              padding-right: 25px !important;
              min-height: 100vh;
              box-sizing: border-box;
            }
            
            /* Tighter spacing between prescription rows */
            .prescription-print-container .medicine-row td {
              padding-top: 4px !important;
              padding-bottom: 4px !important;
              vertical-align: top !important;
            }
            .prescription-print-container .medicine-row {
              border-bottom-width: 1px !important;
            }
            .prescription-print-container table thead th {
              padding-top: 6px !important;
              padding-bottom: 6px !important;
            }
            /* Repeat prescription table header on each page when table spans pages */
            .prescription-print-container table thead {
              display: table-header-group !important;
            }
            .prescription-print-container table tr {
              page-break-inside: avoid !important;
            }
            
            /* Prevent page breaks inside these elements */
            .no-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .medicine-row {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .section-header {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            
            .advice-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            .follow-up-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      {/* Repeating header: shown at top of every printed page */}
      <div className="hidden print:block prescription-print-header" style={{ fontSize: '13px', fontFamily: "'Poppins', sans-serif" }}>
        <div className="flex justify-between items-start mb-0.5">
          <div>
            <span className="font-bold text-[13px]">Patient:</span>
            <span className="font-semibold capitalize ml-1 text-[13px]">{currentPatient?.firstName} {p?.middleName} {currentPatient?.lastName}</span>
            <span className="text-[12px] text-gray-600 ml-2">
              {calculateAge(currentPatient?.dateOfBirth)} yrs / {currentPatient?.gender}
              {currentPatient?.uhid && ` • UHID: ${currentPatient.uhid}`}
            </span>
          </div>
          <div className="text-right">
            <span className="font-bold text-[13px]">Date:</span>
            <span className="ml-1 text-[13px]">{today}</span>
            {doctorInfo?.name && (
              <div className="text-[12px] mt-0.5">
                <span className="font-bold">Dr.</span> {doctorInfo.name}
                {doctorInfo.specialty && ` (${doctorInfo.specialty})`}
              </div>
            )}
          </div>
        </div>
        <div className="text-[11px] text-gray-600">
          <span className="font-bold">Address:</span>
          <span className="ml-1">{buildAddress()}</span>
        </div>
      </div>

      <div ref={ref} className="hidden print:block w-full text-black bg-white prescription-print-container" style={{ fontSize: '13px', fontFamily: "'Poppins', sans-serif" }}>
        {/* Patient & Doctor block (visible in flow on first page; header above repeats on all pages) */}
        <div className="no-break border-b border-gray-400 pb-2 mb-3">
          {/* Row 1: Patient Name and Date */}
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[14px]">Patient:</span>
                <span className="font-semibold capitalize text-[14px]">{currentPatient?.firstName} {p?.middleName} {currentPatient?.lastName}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-[14px]">Date:</span>
              <span className="font-medium ml-1 text-[14px]">{today}</span>
            </div>
          </div>

          {/* Row 2: Age/Gender, UHID, Mobile | Doctor Info */}
          <div className="flex justify-between mb-1.5 text-[14px]">
            <div className="flex gap-4">
              <div>
                <span className="font-bold">Age/Sex:</span>
                <span className="ml-1">{calculateAge(currentPatient?.dateOfBirth)} yrs / {currentPatient?.gender}</span>
              </div>
              <div>
                <span className="font-bold">UHID:</span>
                <span className="ml-1">{currentPatient?.uhid}</span>
              </div>
              {p?.mobile && (
                <div>
                  <span className="font-bold">Mobile:</span>
                  <span className="ml-1">{p.mobile}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              {doctorInfo?.name && (
                <div>
                  <span className="font-bold">Doctor:</span>
                  <span className="ml-1">{doctorInfo.name}</span>
                  {doctorInfo.specialty && <span className="ml-1">({doctorInfo.specialty})</span>}
                </div>
              )}
              {doctorInfo?.registrationNo && (
                <div>
                  <span className="font-bold">Reg. No:</span>
                  <span className="ml-1">{doctorInfo.registrationNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Address */}
          <div className="text-[14px]">
            <span className="font-bold">Address:</span>
            <span className="ml-1">{buildAddress()}</span>
          </div>
        </div>

        {/* Vitals Section */}
        {hasVitals && (
          <div className="no-break mb-3 bg-gray-50 rounded p-2">
            <span className="font-bold text-[14px] uppercase">Vitals:</span>
            <span className="ml-2 text-[14px]">
              {(vitals?.systolicBP && vitals?.diastolicBP) && (
                <><span className="font-bold">BP:</span> {vitals.systolicBP}/{vitals.diastolicBP} mmHg &nbsp;&nbsp;</>)}
              {vitals?.bloodPressure && !vitals?.systolicBP && (
                <><span className="font-bold">BP:</span> {vitals.bloodPressure} mmHg &nbsp;&nbsp;</>)}
              {vitals?.heartRate && (
                <><span className="font-bold">HR:</span> {vitals.heartRate} bpm &nbsp;&nbsp;</>)}
              {vitals?.oxygenSaturation && (
                <><span className="font-bold">SpO2:</span> {vitals.oxygenSaturation}% &nbsp;&nbsp;</>)}
              {vitals?.weight && (
                <><span className="font-bold">Wt:</span> {vitals.weight} kg &nbsp;&nbsp;</>)}
              {vitals?.height && (
                <><span className="font-bold">Ht:</span> {vitals.height} cm &nbsp;&nbsp;</>)}
              {vitals?.bsa && (
                <><span className="font-bold">BSA:</span> {vitals.bsa} m² &nbsp;&nbsp;</>)}
              {vitals?.eGFR && (
                <><span className="font-bold">eGFR:</span> {vitals.eGFR} mL/min</>)}
            </span>
          </div>
        )}

        {/* Chief Complaint & Assessment - Side by Side */}
        {(showChiefComplaint || showAssessment) && (
          <div className="no-break mb-3 flex gap-4 text-[14px]">
            {/* Chief Complaint - 50% */}
            {showChiefComplaint && (
              <div className="flex-1">
                <span className="font-bold uppercase">Chief Complaint:</span>
                <span className="ml-1">{chiefComplaint}</span>
              </div>
            )}
            {/* Assessment - 50% */}
            {showAssessment && (
              <div className="flex-1">
                <span className="font-bold uppercase">Assessment:</span>
                <span className="ml-1">{assessment}</span>
              </div>
            )}
          </div>
        )}

        {/* Diagnosis Section */}
        {showDiagnosis && (
          <div className="no-break mb-3 text-[14px]">
            <span className="font-bold uppercase">Diagnosis:</span>
            <div className="ml-2 mt-1">
              {diagnoses?.map((d, idx) => (
                <div key={d.id || idx} className="flex gap-2">
                  <span className="text-gray-500">{idx + 1}.</span>
                  <span>{d.diagnosisText}</span>
                  {d.icdCode && <span className="text-gray-400">({d.icdCode})</span>}
                  <span className="text-xs text-gray-400 italic">[{d.type}]</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Section */}
        {showHistory && (
          <div className="no-break mb-3 text-[14px] border border-gray-200 rounded p-2 bg-gray-50">
            <span className="font-bold uppercase">Medical History:</span>
            <div className="mt-1 space-y-0.5">
              {history?.presentIllness && (
                <div><span className="font-semibold">Present Illness:</span> {history.presentIllness}</div>
              )}
              {history?.pastMedical && (
                <div><span className="font-semibold">Past Medical:</span> {history.pastMedical}</div>
              )}
              {history?.family && (
                <div><span className="font-semibold">Family History:</span> {history.family}</div>
              )}
              {history?.allergies && (
                <div><span className="font-semibold text-red-600">Allergies:</span> {history.allergies}</div>
              )}
              {history?.addiction && (
                <div><span className="font-semibold">Addiction:</span> {history.addiction}</div>
              )}
            </div>
          </div>
        )}

        {/* Prescription Section */}
        {showPrescription && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[14px] font-serif italic">℞</span>
              <span className="font-bold text-[14px] uppercase">Prescription</span>
            </div>

            {items.length > 0 ? (
              <table className="w-full table-fixed" style={{ fontSize: '13px' }}>
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '5%' }}>#</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '35%' }}>{t('medicine', 'Medicine Name')}</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '15%' }}>Item Type</th>
                    <th className="text-center py-1.5 px-2 font-semibold text-gray-600" style={{ width: '18%' }}>{t('frequency', 'Dose')}</th>
                    <th className="text-center py-1.5 px-2 font-semibold text-gray-600" style={{ width: '12%' }}>{t('duration', 'Days')}</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-600" style={{ width: '20%' }}>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    // Only get translations for Dose (frequency) and Instructions (timing)
                    const translatedTiming = printLanguage !== 'en' ? getTranslatedTiming(item.timing) : null;
                    const translatedFrequency = printLanguage !== 'en' ? getTranslatedFrequency(item.frequency) : null;

                    return (
                      <tr key={item.id || index} className="medicine-row border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-500 align-top">{index + 1}.</td>
                        {/* Product / medicine name (product name from formulary) + generic name below */}
                        <td className="py-2 px-2 align-top">
                          <div>
                            {/* Product / medicine name (from formulary 'Product Name') */}
                            <span className="font-medium text-gray-900">{item.drugName}</span>
                            {/* Generic name shown below */}
                            {item.genericName && (
                              <div className="text-[11px] text-gray-500 mt-0.5 font-normal">
                                {item.genericName}
                              </div>
                            )}
                            {/* Dosage (strength like 500mg) in English */}
                            {item.dosage && (
                              <span className="text-gray-500 ml-1">- {item.dosage}</span>
                            )}
                          </div>
                        </td>

                        {/* Item type column: ItemType from Excel, or fallback from form (Tablet, Capsule, etc.) */}
                        <td className="py-2 px-2 align-top text-gray-700">
                          {(() => {
                            const displayType =
                              item.itemType ||
                              (item.form ? FORM_CONFIGS[item.form].label.en : undefined);
                            return displayType ? (
                              <span className="text-[12px]">
                                {displayType}
                              </span>
                            ) : null;
                          })()}
                        </td>
                        {/* Dose column: English first, translation below */}
                        <td className="py-2 px-2 text-center text-gray-700 align-top">
                          <div>{item.frequency}</div>
                          {translatedFrequency && (
                            <div className="text-[12px] text-blue-600 mt-0.5" style={{ whiteSpace: 'nowrap' }}>{translatedFrequency}</div>
                          )}
                        </td>
                        {/* Duration in English only (days) */}
                        <td className="py-2 px-2 text-center text-gray-700 align-top">
                          {item.durationDays} days
                        </td>
                        {/* Instructions column: English first, translation below */}
                        <td className="py-2 px-2 text-gray-700 align-top">
                          <div>{item.timing || '-'}</div>
                          {translatedTiming && (
                            <div className="text-[12px] text-blue-600 mt-0.5">{translatedTiming}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-[14px] text-gray-400 italic py-2 pl-2">{t('no_medicines', 'No medicines prescribed.')}</p>
            )}
          </div>
        )}

        {/* Advice Section */}
        {hasAdvice && (
          <div className="advice-section no-break mb-3 border border-gray-200 rounded p-2 bg-gray-50 text-[14px]">
            <span className="font-bold uppercase">Advice:</span>
            <div className="mt-1 space-y-1">
              {generalAdvice && (
                <div><span className="font-bold">General:</span> {generalAdvice}</div>
              )}
              {dietaryAdvice && (
                <div><span className="font-bold">Diet:</span> {dietaryAdvice}</div>
              )}
              {activityAdvice && (
                <div><span className="font-bold">Lifestyle:</span> {activityAdvice}</div>
              )}
            </div>
          </div>
        )}

        {/* Follow Up Section */}
        {showFollowUp && (
          <div className="follow-up-section no-break mb-3 border-l-2 border-emerald-600 pl-2 py-1 bg-emerald-50 rounded-r text-[14px]">
            <span className="font-bold text-emerald-700 uppercase">Follow Up:</span>
            <span className="ml-1 text-emerald-800">{followUp}</span>
          </div>
        )}

        {/* Signature Space with Doctor Info */}
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            <div className="h-10 w-40 border-b border-gray-400"></div>
            {doctorInfo?.name && (
              <p className="text-[14px] font-semibold text-gray-800 mt-1">{doctorInfo.name}</p>
            )}
            {doctorInfo?.specialty && (
              <p className="text-[12px] text-gray-600">{doctorInfo.specialty}</p>
            )}
            {doctorInfo?.registrationNo && (
              <p className="text-[12px] text-gray-500">Reg. No: {doctorInfo.registrationNo}</p>
            )}
            {!doctorInfo?.name && (
              <p className="text-[12px] text-gray-500 mt-1">Doctor's Signature</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

PrescriptionPrint.displayName = 'PrescriptionPrint';
