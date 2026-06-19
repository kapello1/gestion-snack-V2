import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

/* ── Particules déco ─────────────────────────────────────── */
const DOTS = [
  { s: { top:'7%',   left:'11%'  }, size:'w-1.5 h-1.5', color:'bg-emerald-400/40', delay:'0s',   dur:'6s'  },
  { s: { top:'62%',  left:'6%'   }, size:'w-2.5 h-2.5', color:'bg-teal-400/30',   delay:'1.6s', dur:'8s'  },
  { s: { top:'25%',  right:'8%'  }, size:'w-2   h-2',   color:'bg-green-300/45',  delay:'3.0s', dur:'7s'  },
  { s: { top:'79%',  right:'13%' }, size:'w-1.5 h-1.5', color:'bg-cyan-400/35',   delay:'0.7s', dur:'9s'  },
  { s: { top:'13%',  right:'4%'  }, size:'w-3   h-3',   color:'bg-emerald-300/20',delay:'2.3s', dur:'7s'  },
  { s: { top:'47%',  left:'3%'   }, size:'w-2   h-2',   color:'bg-teal-300/35',   delay:'4.2s', dur:'8s'  },
  { s: { top:'91%',  left:'32%'  }, size:'w-1.5 h-1.5', color:'bg-green-400/40',  delay:'1.0s', dur:'6s'  },
  { s: { top:'36%',  right:'3%'  }, size:'w-2   h-2',   color:'bg-cyan-300/30',   delay:'5.0s', dur:'7s'  },
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
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-blink" />
        <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">{tag}</span>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 px-4 pt-8 pb-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-[2px]">
      <p className="text-white font-black text-[13px] leading-snug drop-shadow-lg">{title}</p>
      {subtitle && <p className="text-white/55 text-[11px] font-medium mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ── Wrapper input avec bordure animée ──────────────────── */
const InputWrap = ({ error, children }) => (
  <div className={error ? 'input-border-green-error' : 'input-border-green'}>
    <div className="input-inner">{children}</div>
  </div>
);

/* ════════════════════════════════════════════════════════ */

const Register = () => {
  const [formData, setFormData] = useState({
    firstName:'', lastName:'', username:'', email:'',
    password:'', confirmPassword:'', phone:'', address:'',
  });
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim())  e.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim())   e.lastName  = 'Le nom est requis';
    if (!formData.username.trim())   e.username  = "Le nom d'utilisateur est requis";
    if (!formData.email.trim())      e.email     = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email invalide';
    if (!formData.password)          e.password  = 'Le mot de passe est requis';
    else if (formData.password.length < 4) e.password = 'Minimum 4 caractères';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Veuillez corriger les erreurs'); return; }
    setLoading(true);
    try {
      const res = await api.post(API_ENDPOINTS.CUSTOMERS.BASE, {
        firstName: formData.firstName, lastName: formData.lastName,
        username:  formData.username,  email: formData.email,
        password:  formData.password,
        phone:    formData.phone    || null,
        address:  formData.address  || null,
        createdBy: 'SELF',
      });
      toast.success('Inscription réussie ! Redirection en cours...');
      sessionStorage.setItem('verifyEmail', formData.email);
      setTimeout(() => navigate('/verify-email-code'), 800);
    } catch (err) {
      const data = err.response?.data;
      // Erreurs de validation champ par champ (MethodArgumentNotValidException)
      if (data?.errors && typeof data.errors === 'object') {
        setErrors(data.errors);
        toast.error('Veuillez corriger les erreurs dans le formulaire');
      } else {
        toast.error(data?.message || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full bg-transparent text-gray-800 placeholder-gray-400 text-sm font-medium focus:outline-none';

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">

      {/* ════ FOND ANIMÉ ════════════════════════════════════ */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(-45deg, #030f0a, #051a10, #061e14, #040e08, #030f0a)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* ── Blobs morphants ─────────────────────────────────── */}
      <div
        className="absolute animate-blob1"
        style={{
          width: 680, height: 680, top: '-18%', left: '-12%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.38) 0%, rgba(5,150,105,0.18) 50%, transparent 72%)',
          filter: 'blur(55px)',
        }}
      />
      <div
        className="absolute animate-blob2"
        style={{
          width: 560, height: 560, bottom: '-14%', right: '-10%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(13,148,136,0.15) 50%, transparent 72%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute animate-blob3"
        style={{
          width: 340, height: 340, top: '35%', left: '48%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, rgba(16,185,129,0.08) 50%, transparent 72%)',
          filter: 'blur(48px)',
        }}
      />
      <div
        className="absolute animate-float-delay-4"
        style={{
          width: 260, height: 260, top: '6%', right: '22%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.20) 0%, transparent 70%)',
          filter: 'blur(45px)',
        }}
      />

      {/* ── Rings géométriques ─────────────────────────────── */}
      <div
        className="absolute rounded-full border border-white/[0.03] animate-spin-slow"
        style={{ width: 780, height: 780, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="absolute rounded-full border border-emerald-400/[0.06] animate-spin-slow-reverse"
        style={{ width: 520, height: 520, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />

      {/* ── Particules ──────────────────────────────────────── */}
      {DOTS.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${d.size} ${d.color} animate-float`}
          style={{ ...d.s, animationDelay: d.delay, animationDuration: d.dur }}
        />
      ))}

      {/* ════ CARTES PHOTO RESTAURANT (xl+) ════════════════ */}
      <PhotoCard
        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=420&q=85&auto=format&fit=crop"
        fallback="linear-gradient(135deg,#064e3b,#065f46)"
        tag="Bienvenue"
        title="Rejoignez notre communauté"
        subtitle="Accès membre exclusif"
        animCls="animate-drift1"
        style={{ left: '2%', top: '18%', width: 205, height: 265 }}
      />
      <PhotoCard
        src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=380&q=85&auto=format&fit=crop"
        fallback="linear-gradient(135deg,#134e4a,#0f172a)"
        tag="À la carte"
        title="Découvrez nos spécialités"
        subtitle="Fraîcheur · Saison"
        animCls="animate-drift2"
        style={{ left: '2%', top: '60%', width: 185, height: 220 }}
      />
      <PhotoCard
        src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=380&q=85&auto=format&fit=crop"
        fallback="linear-gradient(135deg,#065f46,#0c4a3a)"
        tag="Signature"
        title="L'art de la table"
        subtitle="Chaque repas, une expérience"
        animCls="animate-drift3"
        style={{ right: '2%', top: '25%', width: 195, height: 250 }}
      />

      {/* ════ CARTE INSCRIPTION ════════════════════════════ */}
      <div className="relative z-10 w-full max-w-xl animate-fade-in-up">

        {/* Barre accent animée */}
        <div
          className="h-[3px] rounded-t-3xl animate-gradient-x"
          style={{ background: 'linear-gradient(90deg, #10b981, #0d9488, #06b6d4, #0d9488, #10b981)', backgroundSize: '300% 300%' }}
        />

        <div className="bg-white rounded-b-3xl shadow-[0_40px_100px_rgba(0,0,0,0.65)] px-8 py-9">

          {/* En-tête */}
          <div className="flex flex-col items-center mb-7">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-glow-green mb-4"
              style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}
            >
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h1
              className="text-2xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)' }}
            >
              Créer un compte
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Rejoignez-nous pour commander et réserver</p>
            <div className="flex items-center gap-2 w-full mt-5">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #d1fae5)' }} />
              <span className="text-[11px] font-bold text-emerald-300 px-2 tracking-widest">INSCRIPTION</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, #d1fae5)' }} />
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Prénom <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.firstName}>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="firstName" type="text" required autoComplete="given-name"
                      value={formData.firstName} onChange={handleChange} placeholder="Votre prénom"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
                {errors.firstName && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Nom <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.lastName}>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="lastName" type="text" required autoComplete="family-name"
                      value={formData.lastName} onChange={handleChange} placeholder="Votre nom"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
                {errors.lastName && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Nom d'utilisateur <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.username}>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="username" type="text" required autoComplete="username"
                      value={formData.username} onChange={handleChange} placeholder="Votre identifiant"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
                {errors.username && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Email <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.email}>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="email" type="email" required autoComplete="email"
                      value={formData.email} onChange={handleChange} placeholder="email@exemple.com"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
                {errors.email && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>Téléphone</label>
                <InputWrap>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="phone" type="tel" autoComplete="tel"
                      value={formData.phone} onChange={handleChange} placeholder="+32 468 02 09 86"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>Adresse</label>
                <InputWrap>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="address" type="text" autoComplete="street-address"
                      value={formData.address} onChange={handleChange} placeholder="Adresse complète"
                      className={`${inp} pl-10 pr-4 py-3`} />
                  </div>
                </InputWrap>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Mot de passe <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.password}>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="password" type={showPwd ? 'text' : 'password'} required autoComplete="new-password"
                      value={formData.password} onChange={handleChange} placeholder="Minimum 4 caractères"
                      className={`${inp} pl-10 pr-11 py-3`} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </InputWrap>
                {errors.password && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#059669' }}>
                  Confirmer <span className="text-emerald-400">*</span>
                </label>
                <InputWrap error={errors.confirmPassword}>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 pointer-events-none" />
                    <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} required autoComplete="new-password"
                      value={formData.confirmPassword} onChange={handleChange} placeholder="Répétez le mot de passe"
                      className={`${inp} pl-10 pr-11 py-3`} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </InputWrap>
                {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.confirmPassword}</p>}
              </div>

            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 animate-gradient-x"
                style={{
                  background: 'linear-gradient(90deg, #10b981, #0d9488, #0891b2, #0d9488, #10b981)',
                  backgroundSize: '300% 300%',
                  boxShadow: '0 8px 30px rgba(16,185,129,0.35)',
                }}
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><UserPlus className="h-4 w-4" /> Créer mon compte</>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-bold transition-colors" style={{ color: '#10b981' }}
                onMouseEnter={e => e.target.style.color = '#059669'}
                onMouseLeave={e => e.target.style.color = '#10b981'}>
                Se connecter
              </Link>
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-[11px] font-medium text-gray-400">Vos données sont protégées · 100 % sécurisé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
