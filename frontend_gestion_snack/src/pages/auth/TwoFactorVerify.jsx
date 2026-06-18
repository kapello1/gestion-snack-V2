import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { ShieldCheck, UtensilsCrossed, ArrowLeft, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN = 30; // secondes

const ROLE_ROUTES = {
  ADMIN: '/admin/dashboard', CUSTOMER: '/customer/menu',
  CASHIER: '/cashier/payments', WAITER: '/waiter/orders',
  COOK: '/cook/orders', PROVIDER: '/provider/orders',
};

const TwoFactorVerify = () => {
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const { verifyTwoFactor, user } = useAuth();
  const navigate  = useNavigate();
  const inputsRef = useRef([]);
  const timerRef  = useRef(null);

  const userId = sessionStorage.getItem('twoFactorUserId');

  // Rediriger si déjà connecté ou pas de userId en attente
  useEffect(() => {
    if (user) {
      navigate(ROLE_ROUTES[user.roleName] || '/dashboard');
    } else if (!userId) {
      navigate('/login');
    }
  }, [user, userId, navigate]);

  // Démarrer le cooldown après chaque envoi
  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCooldown(); // cooldown initial dès l'arrivée sur la page
    return () => clearInterval(timerRef.current);
  }, [startCooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await api.post(API_ENDPOINTS.AUTH.RESEND_2FA, { userId: Number(userId) });
      toast.success('Nouveau code envoyé à votre adresse email');
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
      startCooldown();
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du renvoi du code';
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputsRef.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const result = await verifyTwoFactor(Number(userId), code);
      if (result.success) {
        navigate(ROLE_ROUTES[result.data.roleName] || '/dashboard');
      } else {
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <>
      {/* Fond identique à Login */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(-45deg, #050813, #0d0b26, #0a1230, #090a1e, #050813)',
            backgroundSize: '400% 400%',
          }}
        />
        <div
          className="absolute animate-blob1"
          style={{
            width: 'clamp(320px, 55vw, 680px)', height: 'clamp(320px, 55vw, 680px)',
            top: '-10%', left: '-8%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.38) 0%, rgba(79,70,229,0.18) 50%, transparent 72%)',
            filter: 'blur(clamp(30px, 4vw, 55px))',
          }}
        />
        <div
          className="absolute animate-blob2"
          style={{
            width: 'clamp(280px, 46vw, 560px)', height: 'clamp(280px, 46vw, 560px)',
            bottom: '-8%', right: '-6%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.15) 50%, transparent 72%)',
            filter: 'blur(clamp(28px, 3.5vw, 50px))',
          }}
        />
      </div>

      {/* Contenu */}
      <div
        className="relative flex items-center justify-center px-4 py-10 sm:py-12"
        style={{ zIndex: 10, minHeight: '100svh' }}
      >
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Barre accent */}
          <div
            className="h-[3px] rounded-t-3xl animate-gradient-x"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #7c3aed, #6366f1)',
              backgroundSize: '300% 300%',
            }}
          />

          <div className="bg-white rounded-b-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] px-6 sm:px-8 py-8 sm:py-10">

            {/* En-tête */}
            <div className="flex flex-col items-center mb-7">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3 sm:mb-4"
                style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
              >
                <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>

              <h1
                className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea)' }}
              >
                Vérification
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1 text-center px-2">
                Un code à 6 chiffres a été envoyé à votre adresse email
              </p>

              <div className="flex items-center gap-2 w-full mt-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #e0e7ff)' }} />
                <span className="text-[11px] font-bold text-indigo-300 px-2 tracking-widest">CODE 2FA</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, #e0e7ff)' }} />
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-3 text-center" style={{ color: '#4f46e5' }}>
                  Entrez le code reçu par email
                </label>
                {/* 6 cases individuelles */}
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => inputsRef.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-11 h-14 text-center text-2xl font-black border-2 rounded-xl
                                 text-gray-800 focus:outline-none transition-all duration-150"
                      style={{
                        borderColor: d ? '#6366f1' : '#e5e7eb',
                        background: d ? '#eef2ff' : '#f9fafb',
                        boxShadow: d ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isComplete}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-transform
                           duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2 active:scale-[0.98] animate-gradient-x"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #7c3aed, #9333ea, #7c3aed, #6366f1)',
                  backgroundSize: '300% 300%',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
                }}
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Vérifier</>
                )}
              </button>
            </form>

            {/* Renvoyer le code */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                style={{ color: cooldown > 0 ? '#9ca3af' : '#7c3aed' }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {cooldown > 0
                  ? `Renvoyer le code (${cooldown}s)`
                  : resending ? 'Envoi en cours…' : 'Renvoyer le code'}
              </button>
            </div>

            {/* Pied */}
            <div className="mt-4 pt-5 border-t border-gray-100">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 mx-auto text-sm font-semibold text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Retour à la connexion
              </button>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-indigo-300" />
                <span className="text-[11px] font-medium text-gray-400">Le code expire dans 10 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TwoFactorVerify;
