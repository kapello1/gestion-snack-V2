import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

/* ── Icônes restaurant flottantes ──────────────────────── */
const WIDGETS = [
  { icon: '🍕', cls: 'text-5xl',  pos: { top: '5%',  left: '3%'  }, delay: '0s',   dur: '8s'  },
  { icon: '🥗',  cls: 'text-4xl', pos: { top: '8%',  left: '88%' }, delay: '1.8s', dur: '9s'  },
  { icon: '🍣',  cls: 'text-5xl', pos: { top: '60%', left: '2%'  }, delay: '3.5s', dur: '10s' },
  { icon: '🥩',  cls: 'text-4xl', pos: { top: '78%', left: '89%' }, delay: '2s',   dur: '11s' },
  { icon: '🫕',  cls: 'text-5xl', pos: { top: '38%', left: '1%'  }, delay: '4.8s', dur: '9s'  },
  { icon: '🧃',  cls: 'text-3xl', pos: { top: '68%', left: '92%' }, delay: '0.9s', dur: '8s'  },
  { icon: '🎂',  cls: 'text-4xl', pos: { top: '90%', left: '14%' }, delay: '5.5s', dur: '10s' },
  { icon: '🍜',  cls: 'text-4xl', pos: { top: '2%',  left: '47%' }, delay: '2.6s', dur: '9s'  },
  { icon: '🧆',  cls: 'text-3xl', pos: { top: '82%', left: '5%'  }, delay: '6s',   dur: '9s'  },
  { icon: '🌮',  cls: 'text-4xl', pos: { top: '20%', left: '85%' }, delay: '1.2s', dur: '7s'  },
];

/* ── Badges restaurant (desktop) ───────────────────────── */
const BADGES = [
  { icon: '🎁', title: 'Bienvenue',    sub: 'Offre de lancement',  pos: { top: '25%',    left: '2%'  }, delay: '0.5s' },
  { icon: '🚀', title: 'Rapide',       sub: 'Inscription en 1 min', pos: { top: '55%',    right: '2%' }, delay: '2.5s' },
  { icon: '🔒', title: '100% Sécurisé', sub: 'Données protégées',  pos: { bottom: '20%', left: '2%'  }, delay: '4.5s' },
];

/* ── Champ de saisie réutilisable ──────────────────────── */
const Field = ({ id, label, icon: Icon, error, required, inputProps }) => (
  <div className="group">
    <label htmlFor={id} className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
      {label}{required && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Icon className="h-[17px] w-[17px] text-gray-350 group-focus-within:text-emerald-500 transition-colors duration-200" />
      </div>
      <input
        id={id}
        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-350 text-sm font-medium focus:outline-none focus:bg-white focus:shadow-sm transition-all duration-200 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:shadow-red-100'
            : 'border-gray-100 focus:border-emerald-400 focus:shadow-emerald-100'
        }`}
        {...inputProps}
      />
    </div>
    {error && <p className="mt-1 text-[11px] text-red-500 font-semibold">{error}</p>}
  </div>
);

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '', phone: '', address: '',
  });
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState({});
  const [showPassword,  setShowPassword]  = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [modalType,     setModalType]     = useState('email');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim())   e.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim())    e.lastName  = 'Le nom est requis';
    if (!formData.username.trim())    e.username  = "Le nom d'utilisateur est requis";
    if (!formData.email.trim())       e.email     = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email invalide';
    if (!formData.password)           e.password  = 'Le mot de passe est requis';
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
        username: formData.username,   email: formData.email,
        password: formData.password,
        phone:    formData.phone    || null,
        address:  formData.address  || null,
        createdBy: 'SELF',
      });
      setModalType(res.data?.emailVerified ? 'immediate' : 'email');
      setShowModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setShowModal(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">

      {/* ── Fond dégradé animé ──────────────────────────── */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(-45deg, #022c22, #064e3b, #0f172a, #1a0533, #042f2e)',
          backgroundSize: '450% 450%',
        }}
      />

      {/* ── Orbes flous ─────────────────────────────────── */}
      <div className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full bg-emerald-500/20 blur-3xl animate-float"
           style={{ animationDelay: '0s' }} />
      <div className="absolute -bottom-28 -right-28 w-[500px] h-[500px] rounded-full bg-teal-600/25 blur-3xl animate-float"
           style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-[40%] left-[55%] w-72 h-72 rounded-full bg-purple-700/20 blur-3xl animate-float"
           style={{ animationDelay: '4s' }} />
      <div className="absolute top-[15%] left-[25%] w-48 h-48 rounded-full bg-lime-500/12 blur-3xl animate-float"
           style={{ animationDelay: '1.5s' }} />

      {/* ── Anneaux décoratifs ───────────────────────────── */}
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full border border-white/10 animate-spin-slow" />
      <div className="absolute -bottom-8  -right-8  w-40 h-40 rounded-full border border-white/5  animate-spin-slow"
           style={{ animationDirection: 'reverse', animationDuration: '28s' }} />

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

      {/* ── Badges desktop ──────────────────────────────── */}
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

      {/* ── Modal confirmation ──────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in-up">
            <div className="flex justify-center mb-5">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                modalType === 'email' ? 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-300/40' : 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-300/40'
              }`}>
                {modalType === 'email'
                  ? <Mail className="h-10 w-10 text-white" />
                  : <CheckCircle className="h-10 w-10 text-white" />
                }
              </div>
            </div>

            {modalType === 'email' ? (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Vérifiez votre email !</h2>
                <p className="text-gray-500 text-sm mb-1">Un email de confirmation a été envoyé à :</p>
                <p className="font-black text-emerald-600 text-base mb-4 break-all">{formData.email}</p>
                <p className="text-gray-400 text-xs leading-relaxed mb-6">
                  Cliquez sur le lien dans votre boîte mail pour activer votre compte.
                  Le lien est valable <strong className="text-gray-600">24 heures</strong>.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Inscription réussie !</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Votre compte a été créé. Vous pouvez maintenant vous connecter.
                </p>
              </>
            )}

            <button
              onClick={handleModalOk}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-400/30 hover:shadow-emerald-400/50 hover:-translate-y-0.5 transition-all duration-200 text-sm"
            >
              Aller à la connexion
            </button>
          </div>
        </div>
      )}

      {/* ── Carte principale ────────────────────────────── */}
      <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">

        {/* Barre d'accent */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-300 rounded-t-3xl shadow-lg shadow-emerald-500/40" />

        <div className="bg-white/96 backdrop-blur-2xl rounded-b-3xl shadow-[0_32px_80px_rgba(0,0,0,0.55)] px-8 py-9">

          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="relative inline-flex mb-5">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse-glow-green">
                <UserPlus className="h-9 w-9 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white shadow-md animate-twinkle" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Créer un compte</h1>
            <p className="text-gray-500 mt-1.5 text-sm font-medium">
              Inscrivez-vous pour commander et réserver
            </p>
            <div className="flex items-center gap-3 mt-4 px-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
              <span className="text-emerald-400 text-xs">✦</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">

              <Field id="firstName" label="Prénom" icon={User} error={errors.firstName} required
                inputProps={{ name: 'firstName', type: 'text', required: true, autoComplete: 'given-name',
                  value: formData.firstName, onChange: handleChange, placeholder: 'Votre prénom' }} />

              <Field id="lastName" label="Nom" icon={User} error={errors.lastName} required
                inputProps={{ name: 'lastName', type: 'text', required: true, autoComplete: 'family-name',
                  value: formData.lastName, onChange: handleChange, placeholder: 'Votre nom' }} />

              <Field id="username" label="Nom d'utilisateur" icon={User} error={errors.username} required
                inputProps={{ name: 'username', type: 'text', required: true, autoComplete: 'username',
                  value: formData.username, onChange: handleChange, placeholder: 'Votre identifiant' }} />

              <Field id="email" label="Email" icon={Mail} error={errors.email} required
                inputProps={{ name: 'email', type: 'email', required: true, autoComplete: 'email',
                  value: formData.email, onChange: handleChange, placeholder: 'email@exemple.com' }} />

              <Field id="phone" label="Téléphone" icon={Phone}
                inputProps={{ name: 'phone', type: 'tel', autoComplete: 'tel',
                  value: formData.phone, onChange: handleChange, placeholder: '+32 468 02 09 86' }} />

              <Field id="address" label="Adresse" icon={MapPin}
                inputProps={{ name: 'address', type: 'text', autoComplete: 'street-address',
                  value: formData.address, onChange: handleChange, placeholder: 'Adresse complète' }} />

              {/* Mot de passe avec œil */}
              <div className="group">
                <label htmlFor="password" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Mot de passe <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[17px] w-[17px] text-gray-350 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  </div>
                  <input
                    id="password" name="password" type={showPassword ? 'text' : 'password'}
                    required autoComplete="new-password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Minimum 4 caractères"
                    className={`w-full pl-10 pr-11 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-350 text-sm font-medium focus:outline-none focus:bg-white focus:shadow-sm transition-all duration-200 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-emerald-400 focus:shadow-emerald-100'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-emerald-500 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.password}</p>}
              </div>

              {/* Confirmation mot de passe */}
              <div className="group">
                <label htmlFor="confirmPassword" className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Confirmer <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[17px] w-[17px] text-gray-350 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  </div>
                  <input
                    id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Répétez le mot de passe"
                    className={`w-full pl-10 pr-11 py-3 bg-gray-50 border-2 rounded-xl text-gray-900 placeholder-gray-350 text-sm font-medium focus:outline-none focus:bg-white focus:shadow-sm transition-all duration-200 ${errors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-emerald-400 focus:shadow-emerald-100'}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-emerald-500 transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.confirmPassword}</p>}
              </div>

            </div>

            {/* Bouton inscription */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-600 hover:via-teal-600 hover:to-green-600 text-white font-black text-[15px] rounded-2xl shadow-xl shadow-emerald-500/35 hover:shadow-emerald-500/55 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/30 border-t-white" />
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Créer mon compte
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Pied */}
          <div className="mt-7 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-black text-emerald-600 hover:text-emerald-800 transition-colors duration-200">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-center mt-6 text-white/50 text-xs font-semibold tracking-widest uppercase">
          ✦ &nbsp;Rejoignez notre communauté gourmande&nbsp; ✦
        </p>
      </div>
    </div>
  );
};

export default Register;
