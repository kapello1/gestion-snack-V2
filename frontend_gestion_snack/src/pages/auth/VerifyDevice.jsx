import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, UtensilsCrossed, ArrowLeft, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN = 30;

const ROLE_MAP = {
  ADMIN: '/admin/dashboard', CUSTOMER: '/customer/menu',
  CASHIER: '/cashier/payments', WAITER: '/waiter/orders',
  COOK: '/cook/orders', PROVIDER: '/provider/orders',
};

const VerifyDevice = () => {
  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const navigate     = useNavigate();
  const { verifyDevice } = useAuth();
  const inputsRef      = useRef([]);
  const timerRef       = useRef(null);
  const verifiedRef    = useRef(false);
  const submittingRef  = useRef(false);

  const userId = sessionStorage.getItem('deviceVerifyUserId');

  useEffect(() => {
    if (!userId && !verifiedRef.current) navigate('/login');
  }, [userId, navigate]);

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
    startCooldown();
    return () => clearInterval(timerRef.current);
  }, [startCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0)
      inputsRef.current[index - 1]?.focus();
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
    if (submittingRef.current) return;
    const code = digits.join('');
    if (code.length !== 6) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await verifyDevice(Number(userId), code);
      if (result.success) {
        verifiedRef.current = true;
        toast.success('Appareil validé ! Connexion réussie.');
        navigate(ROLE_MAP[result.data.roleName] || '/dashboard');
      } else {
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputsRef.current[0]?.focus(), 50);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await api.post(API_ENDPOINTS.AUTH.RESEND_DEVICE_CODE, { userId: Number(userId) });
      toast.success('Nouveau code envoyé à votre email.');
      startCooldown();
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi du code");
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <>
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 animate-gradient-shift"
          style={{ background: 'linear-gradient(-45deg, #0f0a03, #1a1005, #1e1406, #0e0902, #0f0a03)', backgroundSize: '400% 400%' }} />
        <div className="absolute animate-blob1"
          style={{ width: 'clamp(320px,55vw,680px)', height: 'clamp(320px,55vw,680px)', top: '-10%', left: '-8%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.32) 0%, rgba(217,119,6,0.14) 50%, transparent 72%)',
            filter: 'blur(clamp(30px,4vw,55px))' }} />
        <div className="absolute animate-blob2"
          style={{ width: 'clamp(280px,46vw,560px)', height: 'clamp(280px,46vw,560px)', bottom: '-8%', right: '-6%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.28) 0%, rgba(220,38,38,0.12) 50%, transparent 72%)',
            filter: 'blur(clamp(28px,3.5vw,50px))' }} />
      </div>

      <div className="relative flex items-center justify-center px-4 py-10 sm:py-12"
        style={{ zIndex: 10, minHeight: '100svh' }}>
        <div className="w-full max-w-md animate-fade-in-up">

          <div className="h-[3px] rounded-t-3xl"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)', backgroundSize: '300% 300%' }} />

          <div className="bg-white rounded-b-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] px-6 sm:px-8 py-8 sm:py-10">

            <div className="flex flex-col items-center mb-7">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3 sm:mb-4"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                <ShieldAlert className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #b45309, #dc2626)' }}>
                Nouvel appareil détecté
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1 text-center px-2 leading-relaxed">
                Une tentative de connexion depuis un appareil inconnu a été détectée.
                Un code a été envoyé à votre email.
              </p>
              <div className="flex items-center gap-2 w-full mt-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #fde68a)' }} />
                <span className="text-[11px] font-bold text-amber-400 px-2 tracking-widest">SÉCURITÉ</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, #fde68a)' }} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-3 text-center" style={{ color: '#b45309' }}>
                  Entrez le code reçu par email
                </label>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input key={i} ref={el => inputsRef.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-11 h-14 text-center text-2xl font-black border-2 rounded-xl text-gray-800 focus:outline-none transition-all duration-150"
                      style={{ borderColor: d ? '#f59e0b' : '#e5e7eb', background: d ? '#fffbeb' : '#f9fafb',
                        boxShadow: d ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none' }} />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !isComplete}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-transform duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)',
                  backgroundSize: '300% 300%', boxShadow: '0 8px 28px rgba(245,158,11,0.35)' }}>
                {loading
                  ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><ShieldAlert className="h-4 w-4" /> Valider cet appareil</>}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button type="button" onClick={handleResend} disabled={cooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                style={{ color: cooldown > 0 ? '#9ca3af' : '#b45309' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            <div className="mt-4 pt-5 border-t border-gray-100">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-800 leading-relaxed text-center">
                  <strong>Ce n'est pas vous ?</strong> Ignorez cet email et changez votre mot de passe immédiatement.
                </p>
              </div>
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 mx-auto text-sm font-semibold text-amber-500 hover:text-amber-700 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour à la connexion
              </button>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-[11px] font-medium text-gray-400">Le code expire dans 15 minutes · 5 tentatives max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyDevice;
