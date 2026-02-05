/**
 * Seed medicines from HOSPITAL FORMULARY Excel into Firestore.
 *
 * Expected columns (case-insensitive):
 * - Product name:  header contains "product", "name", "drug", "brand"
 * - Generic name:  header contains "generic"
 *
 * Quantity is set to 0; form/strength are inferred from product name.
 *
 * Run:
 *   npx tsx scripts/seed-formulary.ts /path/to/HOSPITAL FORMULARY.xlsx
 * or:
 *   npm run seed:formulary -- /path/to/HOSPITAL FORMULARY.xlsx
 */
/// <reference types="node" />

import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

// Same Firebase config as client app
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

// Form + strength helpers (same logic as other seed script)
const formPatterns: { pattern: RegExp; form: string }[] = [
  { pattern: /\bTAB\b|\bTABLET\b/i, form: 'TAB' },
  { pattern: /\bCAP\b|\bCAPSULE\b/i, form: 'CAP' },
  {
    pattern:
      /\bSYP\b|\bSYRUP\b|\bSUSP\b|\bSUSPENSION\b|\bLIQUID\b|\bLIQ\b|\bELIXIR\b/i,
    form: 'SYP',
  },
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

interface ParsedRow {
  name: string;
  genericName?: string;
  itemType?: string;
}

function parseFormularyXlsx(filePath: string): ParsedRow[] {
  const buf = readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in workbook');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (
    | string
    | number
  )[][];
  if (rows.length < 2) return [];

  // Detect header row within the first few rows, because many hospital
  // formulary sheets have a title row (e.g. "NABH Formulary ...") before
  // the actual table headers.
  let headerIndex = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i] as (string | number)[];
    if (!row) continue;
    const hasProductLike = row.some((cell) => {
      const text = String(cell ?? '').toLowerCase();
      return (
        /product\s*name/.test(text) ||
        /\bproduct\b/.test(text) ||
        /\bdrug\b/.test(text) ||
        /\bbrand\b/.test(text) ||
        /\bitem\b/.test(text) ||
        /\bname\b/.test(text)
      );
    });
    if (hasProductLike) {
      headerIndex = i;
      break;
    }
  }

  const headerRow = rows[headerIndex] as (string | number)[];

  const productCol = (() => {
    const idx = findColumnIndex(headerRow, [
      /product\s*name/i,
      /drug\s*name/i,
      /brand\s*name/i,
      /product/i,
      /drug/i,
      /brand/i,
      /item/i,
      /name/i,
    ]);
    return idx >= 0 ? idx : 0;
  })();

  const genericCol = findColumnIndex(headerRow, [/generic/i, /generic\s*name/i]);
  const itemTypeCol = findColumnIndex(headerRow, [/item\s*type/i, /\btype\b/i, /\bform\b/i]);

  const seen = new Set<string>();
  const result: ParsedRow[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] as (string | number)[];

    const rawProduct = row[productCol];
    const name =
      typeof rawProduct === 'string'
        ? rawProduct.trim()
        : rawProduct != null
        ? String(rawProduct).trim()
        : '';
    if (!name) continue;

    // Read item type if present (e.g. Tablet, Capsule, Injection)
    let itemType: string | undefined;
    if (itemTypeCol >= 0) {
      const rawType = row[itemTypeCol];
      itemType =
        typeof rawType === 'string'
          ? rawType.trim()
          : rawType != null
          ? String(rawType).trim()
          : undefined;
      if (itemType === '') itemType = undefined;
    }

    // De-duplicate by (name + itemType) so same product with
    // different item types are treated as distinct.
    const key = `${name}|${itemType || ''}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let genericName: string | undefined;
    if (genericCol >= 0) {
      const rawGeneric = row[genericCol];
      genericName =
        typeof rawGeneric === 'string'
          ? rawGeneric.trim()
          : rawGeneric != null
          ? String(rawGeneric).trim()
          : undefined;
      if (genericName === '') genericName = undefined;
    }

    result.push({ name, genericName, itemType });
  }

  return result;
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

async function seedFormulary(filePath: string) {
  const rows = parseFormularyXlsx(filePath);
  console.log(`Parsed ${rows.length} unique rows from "${filePath}"`);

  console.log('Fetching existing medicines from Firestore...');
  const existingNames = await getExistingMedicineNames();
  console.log(`Found ${existingNames.size} existing medicines.`);

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const key = row.name.toUpperCase();
      if (existingNames.has(key)) {
        skipped++;
        continue;
      }

      await addDoc(collection(db, 'medicines'), {
        name: row.name,
        genericName: row.genericName || null,
        itemType: row.itemType || null,
        form: extractForm(row.name),
        strength: extractStrength(row.name) || null,
        quantity: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      existingNames.add(key);
      added++;
      if (added % 100 === 0) {
        console.log(`Added ${added} medicines...`);
      }
    } catch (e) {
      console.error(`Error adding "${row.name}":`, e);
      errors++;
    }
  }

  console.log(
    `Done: ${added} added, ${skipped} skipped (already exist), ${errors} errors.`,
  );
}

const inputPath =
  process.argv[2] ||
  resolve(process.cwd(), 'HOSPITAL FORMULARY.xlsx');
const absolutePath = resolve(inputPath);

if (!existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  console.error(
    'Usage: npx tsx scripts/seed-formulary.ts /path/to/HOSPITAL FORMULARY.xlsx',
  );
  process.exit(1);
}

seedFormulary(absolutePath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

