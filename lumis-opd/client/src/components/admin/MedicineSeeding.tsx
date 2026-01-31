import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { medicineService } from '../../services/medicineService';

interface MedicineSeedingProps {
  onComplete?: (result: { added: number; skipped: number }) => void;
}

export const MedicineSeeding: React.FC<MedicineSeedingProps> = ({ onComplete }) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      setError(null);
      setResult(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleSeed = async () => {
    if (!fileContent) {
      setError('Please upload a file first');
      return;
    }

    setIsSeeding(true);
    setError(null);
    setResult(null);

    try {
      const seedResult = await medicineService.seedFromReport(fileContent);
      setResult(seedResult);
      onComplete?.(seedResult);
    } catch (err) {
      console.error('Seeding error:', err);
      setError('Failed to seed medicines. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Count lines in uploaded content (approximate medicine count)
  const estimatedCount = fileContent
    ? fileContent.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.includes('Product name') && 
               !trimmed.includes('PHARMACY') &&
               !trimmed.includes('Mobile:') &&
               !trimmed.includes('Email:') &&
               !trimmed.includes('Generated at');
      }).length
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Database className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Seed Medicines Database</h3>
          <p className="text-sm text-gray-500">Upload pharmacy inventory report to add medicines</p>
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Pharmacy Report (.txt)
        </label>
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">
                {fileContent ? `File loaded (${estimatedCount} medicines found)` : 'Click to upload or drag & drop'}
              </span>
            </div>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Seed Button */}
      <button
        onClick={handleSeed}
        disabled={isSeeding || !fileContent}
        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSeeding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Seeding medicines...
          </>
        ) : (
          <>
            <Database className="w-4 h-4" />
            Seed Medicines
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-800">Seeding Complete!</p>
            <p className="text-sm text-emerald-700">
              {result.added} medicines added, {result.skipped} skipped (already exist)
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="font-medium mb-1">Supported Format:</p>
        <p>Tab-separated file with medicine name and quantity per line</p>
        <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
          PARACETAMOL 500MG TAB    100<br />
          AMOXICILLIN 250 CAP    50
        </code>
      </div>
    </div>
  );
};
