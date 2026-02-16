import { FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import {
  ConfirmationResult,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithRedirect,
  signInWithPhoneNumber
} from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase client is not configured');
  }
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp(firebaseConfig);
}

export async function startFirebaseGoogleRedirectSignIn() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

export async function consumeFirebaseGoogleRedirectToken() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return result.user.getIdToken(true);
}

function getOrCreateRecaptchaVerifier() {
  const app = getFirebaseApp();
  const auth = getAuth(app);

  if (recaptchaVerifier) {
    return { auth, verifier: recaptchaVerifier };
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible'
  });

  return { auth, verifier: recaptchaVerifier };
}

export async function requestPhoneVerificationCode(phoneNumber: string): Promise<ConfirmationResult> {
  const { auth, verifier } = getOrCreateRecaptchaVerifier();
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (err) {
    try {
      verifier.clear();
    } catch (clearErr) {
      // noop
    }
    recaptchaVerifier = null;
    throw err;
  }
}

export async function signInWithFirebasePhoneCode(confirmation: ConfirmationResult, code: string) {
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken(true);
}

export function resetPhoneRecaptcha() {
  if (!recaptchaVerifier) return;
  try {
    recaptchaVerifier.clear();
  } catch (err) {
    // noop
  } finally {
    recaptchaVerifier = null;
  }
}
