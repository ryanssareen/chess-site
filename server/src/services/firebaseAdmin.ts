import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config';

let initialized = false;

function initFirebaseAdmin() {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }

  if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
    throw new Error('Firebase Admin is not configured');
  }

  initializeApp({
    credential: cert({
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: config.firebasePrivateKey
    })
  });

  initialized = true;
}

export function getFirebaseAuth() {
  initFirebaseAdmin();
  return getAuth();
}
