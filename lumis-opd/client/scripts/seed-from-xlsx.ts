/**
 * Seed medicines from an Excel (.xlsx) file into Firestore.
 * Uses the same Firebase project as the client app.
 *
 * Run: npx tsx scripts/seed-from-xlsx.ts [path/to/report.xlsx]
 * Or: npm run seed:xlsx -- /path/to/report.xlsx
 * Default path: report.xlsx in current directory, or pass full path.
 */
/// <reference types="node" />

import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Use same config as client app (lumis-opd)
const firebaseConfig = {
  apiKey: 'AIzaSyBSopePSfm16f2SEXayMURxjWjaAKa1UaI',
  authDomain: 'warehouse-ec83e.firebaseapp.com',
  projectId: 'warehouse-ec83e',
  storageBucket: 'warehouse-ec83e.firebasestorage.app',
  messagingSenderId: '571724411146',
  appId: '1:571724411146:web:af3414eb971cc5b7d80af3',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

function extractForm(name: string): string {
  for (const { pattern, form } of formPatterns) {
    if (pattern.test(name)) return form;
  }
  return 'OTHER';
}

function extractStrength(name: string): string | undefined {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(MG|ML|GM|G|MCG|IU|%|K|MIU)/i);
  return m ? `${m[1]}${m[2].toUpperCase()}` : undefined;
}

function findColumnIndex(headers: (string | number)[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').trim().toLowerCase();
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

function parseXlsx(filePath: string): { name: string; quantity: number; form: string; strength?: string }[] {
  const buf = readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in workbook');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];
  if (rows.length < 2) return [];

  const headerRow = rows[0] as (string | number)[];
  const nameCol =
    findColumnIndex(headerRow, [/name|product|medicine|drug|item|description/i]) >= 0
      ? findColumnIndex(headerRow, [/name|product|medicine|drug|item|description/i])
      : 0;
  const qtyCol =
    findColumnIndex(headerRow, [/qty|quantity|stock|balance|qty\./i]) >= 0
      ? findColumnIndex(headerRow, [/qty|quantity|stock|balance|qty\./i])
      : 1;

  const medicines: { name: string; quantity: number; form: string; strength?: string }[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as (string | number)[];
    const rawName = row[nameCol];
    const name = typeof rawName === 'string' ? rawName.trim() : rawName != null ? String(rawName).trim() : '';
    if (!name) continue;

    let quantity = 0;
    const rawQty = row[qtyCol];
    if (typeof rawQty === 'number' && !isNaN(rawQty)) quantity = Math.floor(rawQty);
    else if (rawQty != null) quantity = parseInt(String(rawQty).replace(/,/g, ''), 10) || 0;

    const key = name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    medicines.push({
      name,
      quantity,
      form: extractForm(name),
      strength: extractStrength(name),
    });
  }

  return medicines;
}

async function getExistingMedicineNames(): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, 'medicines'));
  const names = new Set<string>();
  snapshot.docs.forEach((d) => {
    const name = (d.data() as { name?: string }).name;
    if (name) names.add(name.toUpperCase());
  });
  return names;
}

async function seedFromXlsx(filePath: string): Promise<{ added: number; skipped: number; errors: number }> {
  const medicines = parseXlsx(filePath);
  console.log(`Parsed ${medicines.length} unique medicines from "${filePath}"`);

  console.log('Fetching existing medicines from Firestore...');
  const existingNames = await getExistingMedicineNames();
  console.log(`Found ${existingNames.size} existing medicines.`);

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const med of medicines) {
    try {
      if (existingNames.has(med.name.toUpperCase())) {
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
      existingNames.add(med.name.toUpperCase());
      added++;
      if (added % 100 === 0) console.log(`Added ${added}...`);
    } catch (e) {
      console.error(`Error adding "${med.name}":`, e);
      errors++;
    }
  }

  console.log(`Done: ${added} added, ${skipped} skipped (already exist), ${errors} errors.`);
  return { added, skipped, errors };
}

const inputPath = process.argv[2] || resolve(process.cwd(), 'report.xlsx');
const absolutePath = resolve(inputPath);

if (!existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  console.error('Usage: npx tsx scripts/seed-from-xlsx.ts [path/to/report.xlsx]');
  process.exit(1);
}

seedFromXlsx(absolutePath)
  .then((r) => {
    process.exit(r.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
