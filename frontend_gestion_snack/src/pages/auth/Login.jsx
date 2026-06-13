import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';

/* ── Icônes restaurant flottantes ──────────────────────── */
const WIDGETS = [
  { icon: '🍽️', cls: 'text-5xl',  pos: { top: '6%',  left: '4%'  }, delay: '0s',   dur: '8s'  },
  { icon: '🥂',  cls: 'text-4xl',  pos: { top: '10%', left: '87%' }, delay: '1.6s', dur: '9s'  },
  { icon: '🍷',  cls: 'text-6xl',  pos: { top: '62%', left: '2%'  }, delay: '3.2s', dur: '10s' },
  { icon: '🍴',  cls: 'text-4xl',  pos: { top: '80%', left: '88%' }, delay: '2.1s', dur: '11s' },
  { icon: '👨‍🍳', cls: 'text-5xl',  pos: { top: '40%', left: '1%'  }, delay: '4.5s', dur: '9s'  },
  { icon: '☕',  cls: 'text-3xl',  pos: { top: '70%', left: '92%' }, delay: '1.1s', dur: '8s'  },
  { icon: '🌟',  cls: 'text-2xl',  pos: { top: '88%', left: '16%' }, delay: '5.2s', dur: '10s' },
  { icon: '🍰',  cls: 'text-4xl',  pos: { top: '3%',  left: '48%' }, delay: '2.8s', dur: '9s'  },
  { icon: '🧁',  cls: 'text-3xl',  pos: { top: '79%', left: '6%'  }, delay: '6.1s', dur: '9s'  },
  { icon: '⭐',  cls: 'text-3xl',  pos: { top: '20%', left: '84%' }, delay: '0.7s', dur: '7s'  },
];

/* ── Badges restaurant flottants (desktop) ─────────────── */
const BADGES = [
  { icon: '⭐', title: '4.9 / 5', sub: '256 avis clients',  pos: { top: '28%',    left: '2%'  }, delay: '1s'  },
  { icon: '🕐', title: 'Ouvert',  sub: '09h00 – 23h00',     pos: { top: '52%',    right: '2%' }, delay: '3s'  },
  { icon: '🏆', title: '#1',      sub: 'Meilleur restaurant', pos: { bottom: '22%', left: '2%' }, delay: '5s'  },
];

const Login = () => {
  const [formData,     setFormData]     = useState({ username: '', password: '' });
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const map = {
        ADMIN: '/admin/dashboard', CUSTOMER: '/customer/menu',
        CASHIER: '/cashier/payments', WAITER: '/waiter/orders',
        COOK: '/cook/orders', PROVIDER: '/provider/orders',
      };
      navigate(map[user.roleName] || '/dashboard');
    }
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

      {/* ── Fond dégradé animé ──────────────────────────── */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(-45deg, #0f172a, #1e1b4b, #0c4a6e, #1a0533, #0f172a)',
          backgroundSize: '450% 450%',
        }}
      />

      {/* ── Orbes flous colorés ─────────────────────────── */}
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-amber-500/20 blur-3xl animate-float"
           style={{ animationDelay: '0s' }} />
      <div className="absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full bg-indigo-600/25 blur-3xl animate-float"
           style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-1/2 left-[55%] w-72 h-72 rounded-full bg-purple-700/20 blur-3xl animate-float"
           style={{ animationDelay: '4s' }} />
      <div className="absolute top-[20%] left-[30%] w-48 h-48 rounded-full bg-teal-500/15 blur-3xl animate-float"
           style={{ animationDelay: '1.5s' }} />

      {/* ── Anneau décoratif tournant (coin haut-gauche) ── */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full border border-white/10 animate-spin-slow" />
      <div className="absolute -top-8  -left-8  w-40 h-40 rounded-full border border-white/5  animate-spin-slow"
           style={{ animationDirection: 'reverse', animationDuration: '30s' }} />

      {/* ── Icônes restaurant flottantes ────────────────── */}
      {WIDGETS.map((w, i) => (
        <div
          key={i}
          className={`absolute ${w.cls} select-none pointer-events-none opacity-25 animate-drift`}
          style={{ ...w.pos, animationDelay: w.delay, animationDuration: w.dur }}
        >
          {w.icon}
        </div>
      ))}

      {/* ── Badges restaurant (desktop uniquement) ──────── */}
      {BADGES.map((b, i) => (
        <div
          key={i}
          className="absolute hidden lg:flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-2.5 animate-float-x"
          style={{ ...b.pos, animationDelay: b.delay }}
        >
          <span className="text-2xl leading-none">{b.icon}</span>
          <div>
            <p className="text-white text-xs font-black leading-tight">{b.title}</p>
            <p className="text-white/55 text-[10px] font-medium leading-tight">{b.sub}</p>
          </div>
        </div>
      ))}

      {/* ── Carte principale ────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">

        {/* Barre d'accent en haut */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 rounded-t-3xl shadow-lg shadow-amber-500/40" />

        <div className="bg-white/96 backdrop-blur-2xl rounded-b-3xl shadow-[0_32px_80px_rgba(0,0,0,0.55)] px-8 py-10">

          {/* En-tête */}
          <div className="text-center mb-9">
            <div className="relative inline-flex mb-5">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse-glow">
                <span className="text-4xl">🍽️</span>
              </div>
              {/* Point vert "en ligne" */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white shadow-md animate-twinkle" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bon retour !</h1>
            <p className="text-gray-500 mt-1.5 text-sm font-medium">Connectez-vous à votre espace</p>

            {/* Séparateur décoratif */}
            <div className="flex items-center gap-3 mt-4 px-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
              <span className="text-amber-400 text-xs">✦</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nom d'utilisateur */}
            <div className="group">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-[18px] w-[18px] text-gray-350 group-focus-within:text-amber-500 transition-colors duration-200" />
                </div>
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre identifiant"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-350 text-sm font-medium focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-md focus:shadow-amber-100 transition-all duration-200"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="group">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-gray-350 group-focus-within:text-amber-500 transition-colors duration-200" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-900 placeholder-gray-350 text-sm font-medium focus:outline-none focus:border-amber-400 focus:bg-white focus:shadow-md focus:shadow-amber-100 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-amber-500 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Mot de passe oublié */}
            <div className="text-right -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-amber-500 hover:text-amber-700 transition-colors duration-200"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white font-black text-[15px] rounded-2xl shadow-xl shadow-amber-500/35 hover:shadow-amber-500/55 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/30 border-t-white" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Pied de carte */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-black text-amber-500 hover:text-amber-700 transition-colors duration-200">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Tagline sous la carte */}
        <p className="text-center mt-6 text-white/50 text-xs font-semibold tracking-widest uppercase">
          ✦ &nbsp;Votre expérience culinaire commence ici&nbsp; ✦
        </p>
      </div>
    </div>
  );
};

export default Login;
