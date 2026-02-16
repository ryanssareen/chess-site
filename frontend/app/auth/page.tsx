'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isFirebaseConfigured,
  requestPhoneVerificationCode,
  resetPhoneRecaptcha,
  signInWithFirebaseGoogle,
  signInWithFirebasePhoneCode
} from '@/lib/firebase';
import type { ConfirmationResult } from 'firebase/auth';

const TRAINING_USERNAME = process.env.NEXT_PUBLIC_TRAINING_USERNAME || 'ryansucksatlifetoo';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp, signInWithGoogle, signInWithPhone } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(TRAINING_USERNAME);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code-sent'>('idle');
  const firebaseEnabled = isFirebaseConfigured();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/play/ai');
    }
  }, [loading, router, user]);

  useEffect(() => {
    return () => {
      resetPhoneRecaptcha();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (mode === 'login') {
        await signIn(username, password);
      } else {
        await signUp(username, password);
      }
      router.replace('/play/ai');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const idToken = await signInWithFirebaseGoogle();
      await signInWithGoogle(idToken);
      router.replace('/play/ai');
    } catch (err: any) {
      const firebaseMessage =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled'
          : err?.response?.data?.message || err?.message || 'Google login failed';
      setMessage(firebaseMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPhoneCode = async () => {
    const normalized = phoneNumber.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      setMessage('Use E.164 phone format, e.g. +15551234567');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const confirmation = await requestPhoneVerificationCode(normalized);
      setPhoneConfirmation(confirmation);
      setPhoneStep('code-sent');
    } catch (err: any) {
      setMessage(err?.message || 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneConfirmation) {
      setMessage('Request a verification code first');
      return;
    }
    if (!phoneCode.trim()) {
      setMessage('Enter the SMS verification code');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const idToken = await signInWithFirebasePhoneCode(phoneConfirmation, phoneCode.trim());
      await signInWithPhone(idToken);
      router.replace('/play/ai');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.message || 'Phone login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!loading && user)) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Lock size={18} /> Training account login
      </div>
      <p className="mt-2 text-sm text-slate-300">
        This build is locked to one training account: <span className="font-semibold text-primary">{TRAINING_USERNAME}</span>.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-white/10 bg-slate-900/50 p-1 text-xs">
        <button
          className={`rounded-md px-3 py-2 ${mode === 'login' ? 'bg-primary/20 text-white' : 'text-slate-300'}`}
          onClick={() => setMode('login')}
          type="button"
        >
          Login
        </button>
        <button
          className={`rounded-md px-3 py-2 ${mode === 'register' ? 'bg-primary/20 text-white' : 'text-slate-300'}`}
          onClick={() => setMode('register')}
          type="button"
        >
          Register
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Username</label>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Password</label>
          <input
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'login' ? 'Sign in' : 'Create training account'}
        </button>
      </form>

      {firebaseEnabled ? (
        <div className="mt-4 space-y-3">
          <div className="mb-2 text-center text-xs text-slate-400">or continue with Google</div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary/50 disabled:opacity-60"
          >
            Continue with Google (Firebase)
          </button>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <div className="text-xs font-semibold text-slate-200">Phone verification (Firebase)</div>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              autoComplete="tel"
              disabled={submitting}
            />
            {phoneStep === 'code-sent' ? (
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white"
                placeholder="Enter SMS code"
                value={phoneCode}
                onChange={(event) => setPhoneCode(event.target.value)}
                disabled={submitting}
              />
            ) : null}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSendPhoneCode}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:border-primary/50 disabled:opacity-60"
              >
                {phoneStep === 'code-sent' ? 'Resend code' : 'Send code'}
              </button>
              <button
                type="button"
                disabled={submitting || phoneStep !== 'code-sent'}
                onClick={handleVerifyPhoneCode}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Verify code
              </button>
            </div>
          </div>
          <div id="recaptcha-container" className="h-0 overflow-hidden" />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-400">
          Set Firebase web config (`NEXT_PUBLIC_FIREBASE_*`) and server Firebase Admin vars to enable Google/Phone login.
        </div>
      )}

      {message ? <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div> : null}
    </div>
  );
}
