/**
 * Medicine Seeding Script
 * 
 * This script parses the pharmacy report and seeds medicines to Firestore.
 * Run with: npx ts-node scripts/seed-medicines.ts
 * 
 * Or use the browser-based version by importing seedMedicinesFromReport()
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

// Firebase config - update with your credentials
const firebaseConfig = {
  apiKey: "AIzaSyAVJ81lk3kb9lEXsNPR1pwL2EXkWJaXQEQ",
  authDomain: "warehouse-ec83e.firebaseapp.com",
  projectId: "warehouse-ec83e",
  storageBucket: "warehouse-ec83e.firebasestorage.app",
  messagingSenderId: "668912060465",
  appId: "1:668912060465:web:4a2f15c86e52b9b55b81a3",
  measurementId: "G-BQ0S1VZ8VP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Medicine form detection patterns
const formPatterns: { pattern: RegExp; form: string }[] = [
  { pattern: /\bTAB\b|\bTABLET\b/i, form: 'TAB' },
  { pattern: /\bCAP\b|\bCAPSULE\b/i, form: 'CAP' },
  { pattern: /\bSYP\b|\bSYRUP\b|\bSUSP\b|\bSUSPENSION\b|\bLIQUID\b|\bLIQ\b|\bELIXIR\b/i, form: 'SYP' },
  { pattern: /\bINJ\b|\bINJECTION\b|\bIV\b|\bVIAL\b/i, form: 'INJ' },
  { pattern: /\bCREAM\b|\bOINTMENT\b/i, form: 'CREAM' },
  { pattern: /\bGEL\b/i, form: 'GEL' },
  { pattern: /\bDROP\b|\bDROPS\b/i, form: 'DROPS' },
  { pattern: /\bPOWDER\b|\bSACHET\b|\bGRANULES\b/i, form: 'POWDER' },
  { pattern: /\bINHALER\b|\bROTACAP\b|\bRESPULE\b|\bNEBULIZER\b/i, form: 'OTHER' },
  { pattern: /\bSPRAY\b|\bLOTION\b|\bSOLUTION\b|\bWASH\b/i, form: 'OTHER' },
];

// Extract medicine form from name
function extractForm(name: string): string {
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

// Parse medicine line from report
function parseMedicineLine(line: string): { name: string; quantity: number } | null {
  // Skip header lines and empty lines
  if (!line.trim() || line.includes('Product name') || line.includes('KAMAL PHARMACY') || 
      line.includes('GROUND FLOOR') || line.includes('Mobile:') || line.includes('Email:') ||
      line.includes('as on') || line.includes('Generated at')) {
    return null;
  }
  
  // Match pattern: Medicine Name followed by tab and quantity
  const parts = line.split('\t');
  if (parts.length >= 2) {
    const name = parts[0].trim();
    const qty = parseInt(parts[1].trim(), 10);
    if (name && !isNaN(qty)) {
      return { name, quantity: qty };
    }
  }
  
  // Try space-separated (last word is quantity)
  const words = line.trim().split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    const qty = parseInt(lastWord, 10);
    if (!isNaN(qty)) {
      const name = words.slice(0, -1).join(' ');
      if (name) {
        return { name, quantity: qty };
      }
    }
  }
  
  return null;
}

// Parse the full report
function parseReport(reportContent: string): { name: string; quantity: number; form: string; strength?: string }[] {
  const lines = reportContent.split('\n');
  const medicines: { name: string; quantity: number; form: string; strength?: string }[] = [];
  const seenNames = new Set<string>();
  
  for (const line of lines) {
    const parsed = parseMedicineLine(line);
    if (parsed && !seenNames.has(parsed.name.toUpperCase())) {
      seenNames.add(parsed.name.toUpperCase());
      medicines.push({
        name: parsed.name,
        quantity: parsed.quantity,
        form: extractForm(parsed.name),
        strength: extractStrength(parsed.name),
      });
    }
  }
  
  return medicines;
}

// Check if medicine already exists
async function medicineExists(name: string): Promise<boolean> {
  const q = query(collection(db, 'medicines'), where('name', '==', name));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Seed medicines to Firestore
export async function seedMedicines(reportContent: string): Promise<{ added: number; skipped: number }> {
  const medicines = parseReport(reportContent);
  let added = 0;
  let skipped = 0;
  
  console.log(`Found ${medicines.length} unique medicines to seed`);
  
  for (const med of medicines) {
    try {
      const exists = await medicineExists(med.name);
      if (exists) {
        skipped++;
        continue;
      }
      
      await addDoc(collection(db, 'medicines'), {
        name: med.name,
        form: med.form,
        strength: med.strength || null,
        quantity: med.quantity,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      added++;
      if (added % 50 === 0) {
        console.log(`Added ${added} medicines...`);
      }
    } catch (error) {
      console.error(`Error adding ${med.name}:`, error);
    }
  }
  
  console.log(`Seeding complete: ${added} added, ${skipped} skipped (already exist)`);
  return { added, skipped };
}

// Export the parser for browser use
export { parseReport };

// Main execution (for Node.js)
const reportContent = `1 AL 5 MG TAB	10
  A D K 16	1
  A D K 20	10
  A D K 24	1
  A D K 32	3
  A TO Z 200ML SYP	9
  A TO Z GOLD CAP	15
  A TO Z TAB	99
  AB PHYLLINE SR 200	134
  AB PHYLLINE TAB	61
  ABDOMINAL BELT M SURGICAL	1
  ABDOMINAL BELT XL SURGICAL	1
  ABDOMINAL SUPPORT	1
  ABGEL	4
  ACAMPTAS 333	102
  ACCU 7 CAP	120
  ACENAC P	61
  ACITROM 2	45
  ACITROM 3	90
  ACITROM 4	60
  ACIVIR 400 DT TAB	20
  ACIVIR IV	4
  ACIVIR SKIN CREAM	2
  ACOGUT TAB	104
  ACTIDE 100MG INJ	10
  ACTIDE 50 MG INJ	6
  ACTIGALL TAB	105
  ACULOG TAB	170
  ACUPRAZ 5MG TAB	495
  ADDNA TAB	92
  ADDPHOS GRANULES	31
  ADRENALINE INJ	43
  ADRENOR INJ	219
  ADULT DIAPER  XL	38
  ADULT DIAPER L	7
  ADULT DIAPER M	3
  ADULT DIPER L WE COMF.	24
  ADULT DIPER M WE COMF.	19
  AEROMIST ADULT MASK	12
  AEROMIST CHILD MASK	2
  AGGRAMED INFUSION 100ML	8
  AIR WAY 0	1
  AIR WAY 00	1
  AIR WAY 2	1
  AIR WAY 3	2
  AKT 4	39
  AKURIT 4 TAB	50
  ALBUREL 20% INJ	3
  ALBUWISE 300GM POWDER	1
  ALDACTONE 25 MG	25
  ALDACTONE 50 MG	100
  ALERID 30ML SYP	4
  ALERID TAB	88
  ALEX JUNIOR SYP	2
  ALEX LOZENGES TAB	16
  ALFOO TAB	134
  ALFUSIN TAB	73
  ALKASTON B6 SYP	12
  ALLEGRA 120	20
  ALLEGRA 180	13
  ALLEGRA M	108
  ALPHACEPT 8 CAP	14
  AMARYL 1 MG TAB	70
  AMARYL M2	140
  AMICLINE TAB	40
  AMIFRU 40	44
  AMINOFULL IV	3
  AMINOFULL SACHET	24
  AMINOFULL TAB	45
  AMINOVEN 10% IV 	5
  AMITONE 10	95
  AMLOGARD 2.5	185
  AMLOKIND 5	165
  AMLOKIND AT TAB	130
  ANAWIN 0.25% INJ	11
  ANAWIN 0.5% INJ	3
  ANAWIN HEAVY INJ	10
  ANDIAL TAB	15
  ANKLE GRIP L	1
  ANKLE TRACTION BRACE	1
  ANOVATE CREAM	4
  ANTID 150 INJ	1
  APIXAPIL 2.5 TAB	40
  APRESOL TAB	219
  AQUAZIDE 12.5MG TAB	10
  ARKAMIN 150 TAB	98
  ARKAMIN TAB	304
  ARM SLING M	1
  ARM SLING POUCH L	1
  ARM SLING S	1
  ARNICOR 100 MG	80
  ARNICOR 50 MG	156`;

// Uncomment to run directly
seedMedicines(reportContent).then(result => {
  console.log('Done:', result);
  process.exit(0);
});
