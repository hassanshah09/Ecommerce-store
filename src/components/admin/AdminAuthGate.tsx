import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ShieldAlert, KeyRound, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { auth } from '../../firebase';

interface AdminAuthGateProps {
  onSuccess: () => void;
  onExit: () => void;
}

export const ADMIN_EMAIL = 'admin@digitaizesolution.com';

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ onSuccess, onExit }) => {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      if (user.email?.toLowerCase() === ADMIN_EMAIL) {
        onSuccess();
      } else {
        await signOut(auth);
        setError(`This Firebase account is not authorized for the hosting admin portal.`);
      }
    });

    return unsubscribe;
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (credential.user.email?.toLowerCase() === ADMIN_EMAIL) {
        onSuccess();
      } else {
        await signOut(auth);
        setError('This Firebase account is not authorized for the hosting admin portal.');
      }
    } catch (authError: any) {
      const code = authError?.code || '';
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Incorrect Firebase email or password.'
          : authError?.message || 'Firebase sign-in failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Restricted Admin Portal
          </h1>
          <p className="text-xs text-stone-400 max-w-xs">
            Sign in with the approved Firebase account to manage products, categories, orders, and store settings.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
              <span>Firebase Email</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={ADMIN_EMAIL}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white focus:outline-hidden transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-300">Firebase Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter Firebase password"
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white focus:outline-hidden transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password || isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Authenticate & Open Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Exit link */}
        <div className="pt-2 border-t border-stone-800/80 text-center">
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Customer Storefront</span>
          </button>
        </div>
      </div>
    </div>
  );
};
