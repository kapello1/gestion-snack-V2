import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogIn, User, Lock, Eye, EyeOff,
  UtensilsCrossed, Clock, Star, ShieldCheck, Users,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────
   Petits points décoratifs (CSS pur, pas d'emojis)
──────────────────────────────────────────────────────── */
const DOTS = [
  { cls: 'w-1.5 h-1.5 bg-indigo-400/50', s: { top: '11%',  left: '17%'  }, delay: '0s',   dur: '5s'  },
  { cls: 'w-2.5 h-2.5 bg-violet-400/35', s: { top: '67%',  left: '9%'   }, delay: '1.5s', dur: '7s'  },
  { cls: 'w-2   h-2   bg-sky-400/45',    s: { top: '30%',  right: '11%' }, delay: '3s',   dur: '6s'  },
  { cls: 'w-1.5 h-1.5 bg-purple-300/55', s: { top: '82%',  right: '18%' }, delay: '0.8s', dur: '8s'  },
  { cls: 'w-3   h-3   bg-indigo-300/25', s: { top: '18%',  right: '7%'  }, delay: '2.2s', dur: '6s'  },
  { cls: 'w-2   h-2   bg-blue-400/40',   s: { top: '52%',  left: '6%'   }, delay: '4s',   dur: '7s'  },
  { cls: 'w-1.5 h-1.5 bg-violet-400/50', s: { top: '91%',  left: '38%'  }, delay: '1.2s', dur: '5s'  },
  { cls: 'w-2   h-2   bg-indigo-300/40', s: { top: '44%',  right: '5%'  }, delay: '5s',   dur: '6s'  },
];

/* ────────────────────────────────────────────────────────
   Widgets flottants (desktop ≥ xl) — aspect "app UI"
──────────────────────────────────────────────────────── */
const WidgetOrder = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-52 border border-gray-100">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <UtensilsCrossed className="h-4 w-4 text-indigo-600" />
      </div>
      <div>
        <p className="text-[12px] font-black text-gray-900 leading-none">Commande #312</p>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Il y a 2 min</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-blink" />
      <p className="text-[11px] text-emerald-600 font-bold">En préparation</p>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-progress" />
    </div>
  </div>
);

const WidgetRating = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-48 border border-gray-100">
    <div className="flex items-center gap-1 mb-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
      ))}
    </div>
    <p className="text-[22px] font-black text-gray-900 leading-none">4.9</p>
    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">sur 5 · 1 248 avis</p>
    <div className="mt-2 flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <p className="text-[10px] text-green-600 font-bold">Restaurant #1 région</p>
    </div>
  </div>
);

const WidgetUsers = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-48 border border-gray-100">
    <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
      <Users className="h-4 w-4 text-violet-600" />
    </div>
    <p className="text-[22px] font-black text-gray-900 leading-none">3 420</p>
    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">clients satisfaits</p>
    <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
      <div className="h-full w-[82%] bg-gradient-to-r from-violet-400 to-purple-600 rounded-full" />
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════ */

const Login = () => {
  const [formData,     setFormData]     = useState({ username: '', password: '' });
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const map = {
      ADMIN: '/admin/dashboard', CUSTOMER: '/customer/menu',
      CASHIER: '/cashier/payments', WAITER: '/waiter/orders',
      COOK: '/cook/orders', PROVIDER: '/provider/orders',
    };
    navigate(map[user.roleName] || '/dashboard');
  }, [user, navigate]);

  const handleChange  = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        const map = {
          ADMIN: '/admin/dashboard', CUSTOMER: '/customer/menu',
          CASHIER: '/cashier/payments', WAITER: '/waiter/orders',
          COOK: '/cook/orders', PROVIDER: '/provider/orders',
        };
        navigate(map[result.data.roleName] || '/dashboard');
      }
    } catch (err) {
      console.error('Erreur connexion:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12">

      {/* ── Fond dégradé animé (profond, sobre) ─────────── */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(-45deg, #080c1a, #0f0d2e, #0a1628, #0d0b24, #080c1a)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* ── Orbes lumineux flous ─────────────────────────── */}
      <div
        className="absolute rounded-full animate-float-slow"
        style={{
          width: 600, height: 600,
          top: '-15%', left: '-10%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 68%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full animate-float-delay-4"
        style={{
          width: 500, height: 500,
          bottom: '-12%', right: '-8%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 68%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full animate-float-delay-2"
        style={{
          width: 300, height: 300,
          top: '38%', left: '55%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 68%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Rings géométriques tournants ─────────────────── */}
      <div
        className="absolute rounded-full border border-white/[0.04] animate-spin-slow"
        style={{ width: 700, height: 700, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="absolute rounded-full border border-indigo-500/[0.07] animate-spin-slow-reverse"
        style={{ width: 480, height: 480, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="absolute rounded-full border border-violet-400/[0.05] animate-spin-slow"
        style={{ width: 280, height: 280, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animationDuration: '20s' }}
      />

      {/* ── Petits points décoratifs ─────────────────────── */}
      {DOTS.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${d.cls} animate-float`}
          style={{ ...d.s, animationDelay: d.delay, animationDuration: d.dur }}
        />
      ))}

      {/* ── Widgets flottants (xl+) ──────────────────────── */}
      <div className="absolute hidden xl:block animate-float-x"
           style={{ top: '22%', left: '3%' }}>
        <WidgetOrder />
      </div>
      <div className="absolute hidden xl:block animate-float-x-delay-2"
           style={{ top: '54%', left: '3%' }}>
        <WidgetRating />
      </div>
      <div className="absolute hidden xl:block animate-float-x-delay-4"
           style={{ top: '36%', right: '3%' }}>
        <WidgetUsers />
      </div>

      {/* ════ CARTE DE CONNEXION ════════════════════════════ */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">

        {/* Barre accent */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-3xl" />

        <div className="bg-white rounded-b-3xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] px-8 py-10">

          {/* ── Logo + titre ─────────────────────────────── */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-blue mb-4">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bon retour !</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Connectez-vous à votre espace</p>

            {/* Séparateur */}
            <div className="flex items-center gap-2 w-full mt-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-semibold text-gray-300 px-1">CONNEXION</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          </div>

          {/* ── Formulaire ───────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identifiant */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre identifiant"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Mot de passe oublié */}
            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-px active:translate-y-0"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <><LogIn className="h-4 w-4" /> Se connecter</>
              )}
            </button>
          </form>

          {/* ── Pied de carte ────────────────────────────── */}
          <div className="mt-7 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Créer un compte
              </Link>
            </p>

            {/* Badge sécurité */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-[11px] font-medium">Connexion sécurisée · Données chiffrées</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
