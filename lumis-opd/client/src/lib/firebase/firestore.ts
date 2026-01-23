import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Helper to convert Firestore Timestamps to Dates
export const convertTimestamps = <T extends DocumentData>(data: T): T => {
  const converted: any = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (converted[key] && typeof converted[key] === 'object' && !Array.isArray(converted[key])) {
      converted[key] = convertTimestamps(converted[key]);
    } else if (Array.isArray(converted[key])) {
      converted[key] = converted[key].map((item: any) =>
        item instanceof Timestamp ? item.toDate() : typeof item === 'object' ? convertTimestamps(item) : item
      );
    }
  });
  return converted;
};

// Generic Firestore service class
export class FirestoreService<T extends { id?: string }> {
  private collectionPath: string;

  constructor(collectionPath: string) {
    this.collectionPath = collectionPath;
  }

  // Get collection reference
  private getCollectionRef(): CollectionReference {
    return collection(db, this.collectionPath);
  }

  // Get document reference
  private getDocRef(id: string): DocumentReference {
    return doc(db, this.collectionPath, id);
  }

  // Create a new document
  async create(data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  }

  // Get a single document by ID
  async getById(id: string): Promise<T | null> {
    const docSnap = await getDoc(this.getDocRef(id));
    if (docSnap.exists()) {
      return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as T;
    }
    return null;
  }

  // Get all documents with optional query constraints
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as T
    );
  }

  // Query documents with where clauses
  async query(
    field: string,
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in',
    value: any
  ): Promise<T[]> {
    const q = query(this.getCollectionRef(), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as T
    );
  }

  // Update a document
  async update(id: string, data: Partial<T>): Promise<void> {
    await updateDoc(this.getDocRef(id), {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }

  // Subscribe to real-time updates for all documents
  subscribe(
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ): () => void {
    const q = query(this.getCollectionRef(), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) =>
        convertTimestamps({ id: doc.id, ...doc.data() }) as T
      );
      callback(data);
    });
  }

  // Subscribe to a single document
  subscribeToDoc(id: string, callback: (data: T | null) => void): () => void {
    return onSnapshot(this.getDocRef(id), (doc) => {
      if (doc.exists()) {
        callback(convertTimestamps({ id: doc.id, ...doc.data() }) as T);
      } else {
        callback(null);
      }
    });
  }
}

// Export query helpers
export { where, orderBy, limit, Timestamp };
