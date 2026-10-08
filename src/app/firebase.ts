import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "skyelite-kenya-charter",
  appId: "1:162538870926:web:355e234481541b7a5f51df",
  apiKey: "AIzaSyDJWywmmD36qeFDxvqzyS9E5AWNjgZUYcE",
  authDomain: "skyelite-kenya-charter.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-skyelitekenyapre-0e0a0496-2449-45f0-b529-5cbce16e736b",
  storageBucket: "skyelite-kenya-charter.firebasestorage.app",
  messagingSenderId: "162538870926",
};

// Initialize Firebase App singleton with the new standalone project
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection on boot as mandated
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is limited.');
    }
  });
}

export interface StoredCharterInquiry {
  tripType: string;
  departureAirport: string;
  arrivalAirport: string;
  flightDate: string;
  passengers: number;
  jetTier: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
}

export async function saveCharterInquiry(inquiry: StoredCharterInquiry): Promise<string> {
  const colRef = collection(db, 'charterInquiries');
  const docRef = await addDoc(colRef, inquiry);
  return docRef.id;
}
