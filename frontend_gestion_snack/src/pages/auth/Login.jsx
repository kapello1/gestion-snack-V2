import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, User, Lock, Eye, EyeOff, UtensilsCrossed, ShieldCheck } from 'lucide-react';

/* ── Particules déco ─────────────────────────────────────── */
const DOTS = [
  { s: { top:'8%',   left:'12%'  }, size:'w-1.5 h-1.5', color:'bg-indigo-400/40', delay:'0s',   dur:'6s'  },
  { s: { top:'64%',  left:'7%'   }, size:'w-2.5 h-2.5', color:'bg-violet-400/30', delay:'1.8s', dur:'8s'  },
  { s: { top:'26%',  right:'9%'  }, size:'w-2   h-2',   color:'bg-purple-300/45', delay:'3.2s', dur:'7s'  },
  { s: { top:'81%',  right:'14%' }, size:'w-1.5 h-1.5', color:'bg-sky-400/35',   delay:'0.6s', dur:'9s'  },
  { s: { top:'14%',  right:'5%'  }, size:'w-3   h-3',   color:'bg-indigo-300/20', delay:'2.5s', dur:'7s'  },
  { s: { top:'49%',  left:'4%'   }, size:'w-2   h-2',   color:'bg-violet-400/35', delay:'4.5s', dur:'8s'  },
  { s: { top:'90%',  left:'35%'  }, size:'w-1.5 h-1.5', color:'bg-purple-400/45', delay:'1.1s', dur:'6s'  },
  { s: { top:'38%',  right:'4%'  }, size:'w-2   h-2',   color:'bg-indigo-300/30', delay:'5.2s', dur:'7s'  },
];

/* ── Carte photo restaurant ──────────────────────────────── */
const PhotoCard = ({ src, fallback, tag, title, subtitle, animCls, style }) => (
  <div
    className={`absolute hidden xl:block overflow-hidden rounded-2xl border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${animCls}`}
    style={style}
  >
    <img
      src={src}
      alt={title}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement.style.background = fallback;
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
    {tag && (
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-blink" />
        <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">{tag}</span>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 px-4 pt-8 pb-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-[2px]">
      <p className="text-white font-black text-[13px] leading-snug drop-shadow-lg">{title}</p>
      {subtitle && <p className="text-white/55 text-[11px] font-medium mt-0.5">{subtitle}</p>}
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

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

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
    <>
      {/* ════ FOND FIXE - ne bouge jamais (clavier, barre URL) ════ */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>

        {/* Dégradé de base animé */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(-45deg, #050813, #0d0b26, #0a1230, #090a1e, #050813)',
            backgroundSize: '400% 400%',
          }}
        />

        {/* Blobs - taille réduite sur mobile via max-width conditionnel */}
        <div
          className="absolute animate-blob1"
          style={{
            width: 'clamp(320px, 55vw, 680px)',
            height: 'clamp(320px, 55vw, 680px)',
            top: '-10%', left: '-8%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.38) 0%, rgba(79,70,229,0.18) 50%, transparent 72%)',
            filter: 'blur(clamp(30px, 4vw, 55px))',
          }}
        />
        <div
          className="absolute animate-blob2"
          style={{
            width: 'clamp(280px, 46vw, 560px)',
            height: 'clamp(280px, 46vw, 560px)',
            bottom: '-8%', right: '-6%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.15) 50%, transparent 72%)',
            filter: 'blur(clamp(28px, 3.5vw, 50px))',
          }}
        />
        <div
          className="absolute animate-blob3"
          style={{
            width: 'clamp(160px, 28vw, 340px)',
            height: 'clamp(160px, 28vw, 340px)',
            top: '35%', left: '45%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(14,165,233,0.08) 50%, transparent 72%)',
            filter: 'blur(clamp(24px, 3vw, 48px))',
          }}
        />
        <div
          className="absolute animate-float-delay-4"
          style={{
            width: 'clamp(140px, 22vw, 280px)',
            height: 'clamp(140px, 22vw, 280px)',
            top: '5%', right: '20%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)',
            filter: 'blur(clamp(22px, 3vw, 45px))',
          }}
        />

        {/* Rings - cachés sur mobile via CSS */}
        <div
          className="absolute rounded-full border border-white/[0.03] animate-spin-slow"
          style={{ width: 780, height: 780, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />
        <div
          className="absolute rounded-full border border-indigo-400/[0.06] animate-spin-slow-reverse"
          style={{ width: 520, height: 520, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />

        {/* Particules */}
        {DOTS.map((d, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${d.size} ${d.color} animate-float`}
            style={{ ...d.s, animationDelay: d.delay, animationDuration: d.dur }}
          />
        ))}
      </div>

      {/* ════ CONTENU - scrollable, hauteur safe sur iOS ════ */}
      <div
        className="relative flex items-center justify-center px-4 py-10 sm:py-12"
        style={{ zIndex: 10, minHeight: '100svh' }}
      >
        {/* Cartes photo restaurant (xl+) */}
        <PhotoCard
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=420&q=85&auto=format&fit=crop"
          fallback="linear-gradient(135deg,#1e1b4b,#312e81)"
          tag="Ambiance"
          title="Une expérience gastronomique unique"
          subtitle="Cuisine raffinée · Cadre élégant"
          animCls="animate-drift1"
          style={{ left: '2%', top: '14%', width: 210, height: 270 }}
        />
        <PhotoCard
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=380&q=85&auto=format&fit=crop"
          fallback="linear-gradient(135deg,#1e3a5f,#0f172a)"
          tag="Menu du jour"
          title="Créations du chef"
          subtitle="Saison · Produits frais"
          animCls="animate-drift2"
          style={{ left: '2%', top: '56%', width: 185, height: 230 }}
        />
        <PhotoCard
          src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=380&q=85&auto=format&fit=crop"
          fallback="linear-gradient(135deg,#3b0764,#1e1b4b)"
          tag="Spécialité"
          title="Plats signature maison"
          subtitle="Chaque détail compte"
          animCls="animate-drift3"
          style={{ right: '2%', top: '22%', width: 195, height: 255 }}
        />

        {/* ════ CARTE CONNEXION ════════════════════════════ */}
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Barre accent animée */}
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
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg animate-glow-blue mb-3 sm:mb-4"
                style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
              >
                <UtensilsCrossed className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>

              <h1
                className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea)' }}
              >
                Bon retour !
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Connectez-vous à votre espace</p>

              <div className="flex items-center gap-2 w-full mt-4">
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #e0e7ff)' }} />
                <span className="text-[11px] font-bold text-indigo-300 px-2 tracking-widest">CONNEXION</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, #e0e7ff)' }} />
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

              {/* Identifiant */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#4f46e5' }}>
                  Nom d'utilisateur
                </label>
                <div className="input-border">
                  <div className="input-inner">
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none" />
                      <input
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        inputMode="text"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Votre identifiant"
                        className="w-full pl-10 pr-4 py-3 bg-transparent text-gray-800 placeholder-gray-400 text-sm font-medium focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#4f46e5' }}>
                  Mot de passe
                </label>
                <div className="input-border">
                  <div className="input-inner">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none" />
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Votre mot de passe"
                        className="w-full pl-10 pr-11 py-3 bg-transparent text-gray-800 placeholder-gray-400 text-sm font-medium focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold"
                  style={{ color: '#7c3aed' }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-transform duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] animate-gradient-x"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #7c3aed, #9333ea, #7c3aed, #6366f1)',
                  backgroundSize: '300% 300%',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
                }}
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><LogIn className="h-4 w-4" /> Se connecter</>
                )}
              </button>
            </form>

            {/* Pied */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-center text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <Link to="/register" className="font-bold" style={{ color: '#6366f1' }}>
                  Créer un compte
                </Link>
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
                <span className="text-[11px] font-medium text-gray-400">Connexion sécurisée · Données chiffrées</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
