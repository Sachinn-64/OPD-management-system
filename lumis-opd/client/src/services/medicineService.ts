import { FirestoreService, COLLECTIONS, Medicine } from '../lib/firebase';
import { db } from '../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export type { Medicine };

// Medicine form detection patterns
const formPatterns: { pattern: RegExp; form: Medicine['form'] }[] = [
  { pattern: /\bTAB\b|\bTABLET\b/i, form: 'TAB' },
  { pattern: /\bCAP\b|\bCAPSULE\b/i, form: 'CAP' },
  { pattern: /\bSYP\b|\bSYRUP\b|\bSUSP\b|\bSUSPENSION\b|\bLIQUID\b|\bLIQ\b|\bELIXIR\b/i, form: 'SYP' },
  { pattern: /\bINJ\b|\bINJECTION\b|\bIV\b|\bVIAL\b/i, form: 'INJ' },
  { pattern: /\bCREAM\b|\bOINTMENT\b/i, form: 'CREAM' },
  { pattern: /\bGEL\b/i, form: 'GEL' },
  { pattern: /\bDROP\b|\bDROPS\b/i, form: 'DROPS' },
  { pattern: /\bPOWDER\b|\bSACHET\b|\bGRANULES\b/i, form: 'POWDER' },
];

// Extract medicine form from name
function extractForm(name: string): Medicine['form'] {
  for (const { pattern, form } of formPatterns) {
    if (pattern.test(name)) {
      return form;
    }
  }
  return 'OTHER';
}

// Extract strength from name (e.g., "500MG", "100ML", "2.5MG")
function extractStrength(name: string): string | undefined {
  const strengthMatch = name.match(/(\d+(?:\.\d+)?)\s*(MG|ML|GM|G|MCG|IU|%|K|MIU)/i);
  if (strengthMatch) {
    return `${strengthMatch[1]}${strengthMatch[2].toUpperCase()}`;
  }
  return undefined;
}

class MedicineService {
  private cachedMedicines: Medicine[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getService() {
    return new FirestoreService<Medicine>(COLLECTIONS.MEDICINES);
  }

  // Get all medicines (with caching)
  async getAll(): Promise<Medicine[]> {
    const now = Date.now();
    
    // Return cached if valid
    if (this.cachedMedicines && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedMedicines;
    }

    try {
      const medicines = await this.getService().getAll([]);
      console.log('Medicines fetched from Firestore:', medicines.length);
      
      // Sort alphabetically
      medicines.sort((a, b) => a.name.localeCompare(b.name));
      
      // Cache the results
      this.cachedMedicines = medicines;
      this.cacheTimestamp = now;
      
      return medicines;
    } catch (err) {
      console.error('Error fetching medicines:', err);
      return this.cachedMedicines || [];
    }
  }

  // Search medicines by name (returns top matches)
  async search(query: string, limit: number = 10): Promise<Medicine[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const allMedicines = await this.getAll();
    const lowerQuery = query.toLowerCase();
    
    // Score-based matching
    const scored = allMedicines
      .map(med => {
        const name = med.name.toLowerCase();
        let score = 0;
        
        // Exact match
        if (name === lowerQuery) score = 100;
        // Starts with query
        else if (name.startsWith(lowerQuery)) score = 80;
        // Word starts with query
        else if (name.split(' ').some(word => word.startsWith(lowerQuery))) score = 60;
        // Contains query
        else if (name.includes(lowerQuery)) score = 40;
        
        return { medicine: med, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.medicine);

    return scored;
  }

  // Get medicine by ID
  async getById(id: string): Promise<Medicine | null> {
    return this.getService().getById(id);
  }

  // Create a new medicine
  async create(data: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine> {
    const service = this.getService();
    const id = await service.create({
      ...data,
      form: data.form || extractForm(data.name),
      strength: data.strength || extractStrength(data.name),
      isActive: true,
    } as any);

    // Invalidate cache
    this.cachedMedicines = null;

    return {
      id,
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Seed medicines from report text
  async seedFromReport(reportContent: string): Promise<{ added: number; skipped: number }> {
    const lines = reportContent.split('\n');
    const medicines: { name: string; quantity: number }[] = [];
    const seenNames = new Set<string>();

    for (const line of lines) {
      // Skip header/footer lines
      if (!line.trim() || 
          line.includes('Product name') || 
          line.includes('KAMAL PHARMACY') ||
          line.includes('GROUND FLOOR') || 
          line.includes('Mobile:') || 
          line.includes('Email:') ||
          line.includes('as on') || 
          line.includes('Generated at') ||
          line.includes('Qty')) {
        continue;
      }

      // Parse line (tab-separated: Name\tQty)
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const qty = parseInt(parts[1].trim(), 10);
        if (name && !isNaN(qty) && !seenNames.has(name.toUpperCase())) {
          seenNames.add(name.toUpperCase());
          medicines.push({ name, quantity: qty });
        }
      }
    }

    console.log(`Found ${medicines.length} medicines to seed`);

    // Get existing medicine names
    const existing = await this.getAll();
    const existingNames = new Set(existing.map(m => m.name.toUpperCase()));

    let added = 0;
    let skipped = 0;

    for (const med of medicines) {
      if (existingNames.has(med.name.toUpperCase())) {
        skipped++;
        continue;
      }

      try {
        await addDoc(collection(db, COLLECTIONS.MEDICINES), {
          name: med.name,
          form: extractForm(med.name),
          strength: extractStrength(med.name) || null,
          quantity: med.quantity,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        added++;
        
        if (added % 50 === 0) {
          console.log(`Added ${added} medicines...`);
        }
      } catch (err) {
        console.error(`Error adding ${med.name}:`, err);
      }
    }

    // Invalidate cache
    this.cachedMedicines = null;

    console.log(`Seeding complete: ${added} added, ${skipped} skipped`);
    return { added, skipped };
  }

  // Clear cache (useful after seeding)
  clearCache() {
    this.cachedMedicines = null;
    this.cacheTimestamp = 0;
  }
}

export const medicineService = new MedicineService();
