import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { medicineService, Medicine } from '../../services/medicineService';
import toast from 'react-hot-toast';

interface MedicineAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when user selects a medicine from suggestions (passes full medicine so parent can store genericName) */
  onSelectMedicine?: (medicine: Medicine) => void;
  placeholder?: string;
  className?: string;
}

export const MedicineAutocomplete: React.FC<MedicineAutocompleteProps> = ({
  value,
  onChange,
  onSelectMedicine,
  placeholder = 'Type medicine name...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedNamesRef = useRef<Set<string>>(new Set());

  // Add or confirm custom medicine name (add to Firestore if not present)
  const confirmCustomName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    const key = trimmed.toLowerCase();
    if (addedNamesRef.current.has(key)) {
      onChange(trimmed);
      setIsOpen(false);
      return;
    }

    setIsAdding(true);
    try {
      const existing = await medicineService.search(trimmed, 5);
      const exactMatch = existing.find((m) => m.name.toLowerCase() === key);
      if (exactMatch) {
        onChange(exactMatch.name);
        setIsOpen(false);
        return;
      }
      await medicineService.create({ 
        name: trimmed, 
        quantity: 0, 
        isActive: true,
        strength: '',
        form: 'OTHER'
      });
      addedNamesRef.current.add(key);
      onChange(trimmed);
      setIsOpen(false);
      toast.success(`"${trimmed}" added to medicines`);
    } catch (err) {
      console.error('Error adding medicine:', err);
      toast.error('Failed to add medicine. You can still use the name.');
      onChange(trimmed);
      setIsOpen(false);
    } finally {
      setIsAdding(false);
    }
  }, [onChange]);

  // Search for medicines
  const searchMedicines = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setFetchError(null);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const results = await medicineService.search(query, 10);
      setSuggestions(results);
      setHighlightedIndex(-1);
      // Always open dropdown when user has typed 2+ chars so we show list OR "no results" / error
      setIsOpen(true);
    } catch (err) {
      console.error('Error searching medicines:', err);
      setSuggestions([]);
      setFetchError('Could not load medicines. Check connection or Firestore rules.');
      toast.error('Could not load medicine list');
      setIsOpen(true); // Show dropdown so user can still type and add custom name
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchMedicines(value);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, searchMedicines]);

  // Cleanup blur timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && suggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectMedicine(suggestions[highlightedIndex]);
        } else if (value.trim().length >= 2) {
          // No match or custom name: add to Firestore and use it
          confirmCustomName(value);
        }
        return;
      case 'Escape':
        setIsOpen(false);
        return;
    }

    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
    }
  };

  // Select a medicine from suggestions
  const selectMedicine = (medicine: Medicine) => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    // If parent handles full selection (drugName + genericName), use that only to avoid double state updates
    if (onSelectMedicine) {
      onSelectMedicine(medicine);
    } else {
      onChange(medicine.name);
    }
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Get form badge color
  const getFormBadgeColor = (form?: string) => {
    switch (form) {
      case 'TAB': return 'bg-blue-100 text-blue-700';
      case 'CAP': return 'bg-purple-100 text-purple-700';
      case 'SYP': return 'bg-amber-100 text-amber-700';
      case 'INJ': return 'bg-red-100 text-red-700';
      case 'CREAM': return 'bg-pink-100 text-pink-700';
      case 'GEL': return 'bg-cyan-100 text-cyan-700';
      case 'DROPS': return 'bg-teal-100 text-teal-700';
      case 'POWDER': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const t = value.trim();
            if (t.length >= 2) {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = setTimeout(() => {
                blurTimerRef.current = null;
                confirmCustomName(t);
              }, 200);
            }
          }}
          onFocus={() => {
            if (blurTimerRef.current) {
              clearTimeout(blurTimerRef.current);
              blurTimerRef.current = null;
            }
            if (value.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 pr-10 border border-gray-300 rounded text-base focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((medicine, index) => (
            <button
              key={medicine.id || index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectMedicine(medicine);
              }}
              className={`w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                highlightedIndex === index ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 block truncate">
                  {medicine.name}
                </span>
                {medicine.strength && (
                  <span className="text-xs text-gray-500">{medicine.strength}</span>
                )}
              </div>
              {medicine.form && (
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${getFormBadgeColor(medicine.form)}`}>
                  {medicine.form}
                </span>
              )}
            </button>
          ))}
          
          {/* Option to use custom name if no exact match — adds to Firestore */}
          {value.trim().length >= 2 && !suggestions.some(s => s.name.toLowerCase() === value.trim().toLowerCase()) && (
            <button
              type="button"
              disabled={isAdding}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isAdding) confirmCustomName(value);
              }}
              className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-emerald-50 border-t border-gray-100 text-gray-700 disabled:opacity-60"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isAdding ? 'Adding...' : `Use "${value.trim()}" (add to medicines)`}</span>
            </button>
          )}
        </div>
      )}

      {/* Empty state: no results or fetch error — still allow adding custom name */}
      {isOpen && value.trim().length >= 2 && suggestions.length === 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
        >
          {fetchError ? (
            <p className="text-amber-600 text-sm text-center">{fetchError}</p>
          ) : (
            <p className="text-gray-500 text-sm text-center">No medicines found</p>
          )}
          <button
            type="button"
            disabled={isAdding}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isAdding) confirmCustomName(value);
            }}
            className="w-full mt-2 px-3 py-2 flex items-center justify-center gap-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium disabled:opacity-60"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Adding...' : `Add "${value.trim()}" to medicines`}
          </button>
        </div>
      )}
    </div>
  );
};
