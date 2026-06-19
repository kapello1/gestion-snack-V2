import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { MailCheck, UtensilsCrossed, ArrowLeft, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN = 30;

const VerifyEmailCode = () => {
  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const navigate     = useNavigate();
  const inputsRef    = useRef([]);
  const timerRef     = useRef(null);
  const verifiedRef  = useRef(false);

  const email = sessionStorage.getItem('verifyEmail');

  useEffect(() => {
    if (!email && !verifiedRef.current) navigate('/register');
  }, [email, navigate]);

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
    const code = digits.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api.post(API_ENDPOINTS.CUSTOMERS.VERIFY_EMAIL_CODE, { email, code });
      verifiedRef.current = true;
      sessionStorage.removeItem('verifyEmail');
      toast.success('Email vérifié ! Vous pouvez maintenant vous connecter.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Code invalide');
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      // Re-appel du flux d'inscription n'est pas possible directement ;
      // on informe l'utilisateur de se réinscrire si le code est expiré
      toast.info('Si votre code a expiré, veuillez créer un nouveau compte.');
      startCooldown();
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <>
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 animate-gradient-shift"
          style={{ background: 'linear-gradient(-45deg, #030f0a, #051a10, #061e14, #040e08, #030f0a)', backgroundSize: '400% 400%' }} />
        <div className="absolute animate-blob1"
          style={{ width: 'clamp(320px,55vw,680px)', height: 'clamp(320px,55vw,680px)', top: '-10%', left: '-8%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.38) 0%, rgba(5,150,105,0.18) 50%, transparent 72%)',
            filter: 'blur(clamp(30px,4vw,55px))' }} />
        <div className="absolute animate-blob2"
          style={{ width: 'clamp(280px,46vw,560px)', height: 'clamp(280px,46vw,560px)', bottom: '-8%', right: '-6%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(13,148,136,0.15) 50%, transparent 72%)',
            filter: 'blur(clamp(28px,3.5vw,50px))' }} />
      </div>

      <div className="relative flex items-center justify-center px-4 py-10 sm:py-12"
        style={{ zIndex: 10, minHeight: '100svh' }}>
        <div className="w-full max-w-md animate-fade-in-up">

          <div className="h-[3px] rounded-t-3xl animate-gradient-x"
            style={{ background: 'linear-gradient(90deg, #10b981, #0d9488, #06b6d4, #0d9488, #10b981)', backgroundSize: '300% 300%' }} />

          <div className="bg-white rounded-b-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] px-6 sm:px-8 py-8 sm:py-10">

            <div className="flex flex-col items-center mb-7">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3 sm:mb-4"
                style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
                <MailCheck className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)' }}>
                Vérification email
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1 text-center px-2">
                Un code à 6 chiffres a été envoyé à<br />
                <strong className="text-emerald-600">{email}</strong>
              </p>
              <div className="flex items-center gap-2 w-full mt-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #d1fae5)' }} />
                <span className="text-[11px] font-bold text-emerald-300 px-2 tracking-widest">CODE EMAIL</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, #d1fae5)' }} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-3 text-center" style={{ color: '#059669' }}>
                  Entrez le code reçu par email
                </label>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input key={i} ref={el => inputsRef.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-11 h-14 text-center text-2xl font-black border-2 rounded-xl text-gray-800 focus:outline-none transition-all duration-150"
                      style={{ borderColor: d ? '#10b981' : '#e5e7eb', background: d ? '#ecfdf5' : '#f9fafb',
                        boxShadow: d ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none' }} />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || !isComplete}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-transform duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] animate-gradient-x"
                style={{ background: 'linear-gradient(90deg, #10b981, #0d9488, #0891b2, #0d9488, #10b981)',
                  backgroundSize: '300% 300%', boxShadow: '0 8px 28px rgba(16,185,129,0.35)' }}>
                {loading
                  ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><MailCheck className="h-4 w-4" /> Vérifier mon email</>}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button type="button" onClick={handleResend} disabled={cooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                style={{ color: cooldown > 0 ? '#9ca3af' : '#0d9488' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            <div className="mt-4 pt-5 border-t border-gray-100">
              <button onClick={() => navigate('/register')}
                className="flex items-center gap-1.5 mx-auto text-sm font-semibold text-emerald-400 hover:text-emerald-600 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour à l'inscription
              </button>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-[11px] font-medium text-gray-400">Le code expire dans 15 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmailCode;
