import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus, User, Mail, Lock, Phone, MapPin,
  Eye, EyeOff, CheckCircle, Gift, Zap, ShieldCheck, CalendarCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

/* ────────────────────────────────────────────────────────
   Petits points décoratifs
──────────────────────────────────────────────────────── */
const DOTS = [
  { cls: 'w-1.5 h-1.5 bg-emerald-400/50', s: { top: '9%',  left: '14%'  }, delay: '0s',   dur: '5s' },
  { cls: 'w-2.5 h-2.5 bg-teal-400/30',    s: { top: '65%', left: '7%'   }, delay: '1.6s', dur: '7s' },
  { cls: 'w-2   h-2   bg-green-400/40',   s: { top: '28%', right: '10%' }, delay: '3.1s', dur: '6s' },
  { cls: 'w-1.5 h-1.5 bg-emerald-300/55', s: { top: '80%', right: '16%' }, delay: '0.7s', dur: '8s' },
  { cls: 'w-3   h-3   bg-teal-300/20',    s: { top: '16%', right: '6%'  }, delay: '2.3s', dur: '6s' },
  { cls: 'w-2   h-2   bg-cyan-400/35',    s: { top: '50%', left: '5%'   }, delay: '4.2s', dur: '7s' },
  { cls: 'w-1.5 h-1.5 bg-green-300/50',   s: { top: '92%', left: '42%'  }, delay: '1s',   dur: '5s' },
];

/* ────────────────────────────────────────────────────────
   Widgets flottants (desktop ≥ xl)
──────────────────────────────────────────────────────── */
const WidgetWelcome = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-52 border border-gray-100">
    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
      <Gift className="h-4 w-4 text-emerald-600" />
    </div>
    <p className="text-[13px] font-black text-gray-900 leading-tight">Offre de bienvenue</p>
    <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
      Votre premier repas avec une remise exclusive.
    </p>
    <div className="mt-3 flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-blink" />
      <span className="text-[10px] text-emerald-600 font-bold">Disponible maintenant</span>
    </div>
  </div>
);

const WidgetSpeed = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-48 border border-gray-100">
    <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center mb-3">
      <Zap className="h-4 w-4 text-teal-600" />
    </div>
    <p className="text-[13px] font-black text-gray-900">Inscription rapide</p>
    <p className="text-[10px] text-gray-400 font-medium mt-1">Moins d'une minute</p>
    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full w-[90%] bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full" />
    </div>
  </div>
);

const WidgetReservation = () => (
  <div className="bg-white rounded-2xl shadow-2xl p-4 w-52 border border-gray-100">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <CalendarCheck className="h-4 w-4 text-cyan-600" />
      </div>
      <div>
        <p className="text-[12px] font-black text-gray-900 leading-none">Réservation</p>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Table pour 4 · 20h00</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <CheckCircle className="h-3 w-3 text-emerald-500" />
      <span className="text-[11px] text-emerald-600 font-bold">Confirmée</span>
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────
   Champ réutilisable
──────────────────────────────────────────────────────── */
const Field = ({ id, label, icon: Icon, error, required: req, children }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold text-gray-600 mb-1.5">
      {label}{req && <span className="text-emerald-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      {children}
    </div>
    {error && <p className="mt-1 text-[11px] text-red-500 font-semibold">{error}</p>}
  </div>
);

/* ════════════════════════════════════════════════════════ */

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '', phone: '', address: '',
  });
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [modalType,    setModalType]    = useState('email');
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

  /* ── Classe commune pour les inputs ─────────────────── */
  const inputCls = (field) =>
    `w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
        : 'border-gray-200 focus:border-emerald-400 focus:ring-emerald-100'
    }`;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">

      {/* ── Fond dégradé animé ──────────────────────────── */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(-45deg, #06130d, #071a14, #0a1628, #061310, #071a14)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* ── Orbes lumineux ───────────────────────────────── */}
      <div
        className="absolute rounded-full animate-float-slow"
        style={{
          width: 580, height: 580, top: '-14%', left: '-8%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 68%)',
          filter: 'blur(65px)',
        }}
      />
      <div
        className="absolute rounded-full animate-float-delay-4"
        style={{
          width: 480, height: 480, bottom: '-12%', right: '-8%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.22) 0%, transparent 68%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full animate-float-delay-2"
        style={{
          width: 280, height: 280, top: '35%', left: '58%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 68%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Rings tournants ──────────────────────────────── */}
      <div
        className="absolute rounded-full border border-white/[0.04] animate-spin-slow"
        style={{ width: 720, height: 720, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <div
        className="absolute rounded-full border border-emerald-500/[0.07] animate-spin-slow-reverse"
        style={{ width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      />

      {/* ── Points décoratifs ─────────────────────────────── */}
      {DOTS.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${d.cls} animate-float`}
          style={{ ...d.s, animationDelay: d.delay, animationDuration: d.dur }}
        />
      ))}

      {/* ── Widgets flottants (xl+) ──────────────────────── */}
      <div className="absolute hidden xl:block animate-float-x"
           style={{ top: '18%', left: '3%' }}>
        <WidgetWelcome />
      </div>
      <div className="absolute hidden xl:block animate-float-x-delay-2"
           style={{ top: '55%', left: '3%' }}>
        <WidgetSpeed />
      </div>
      <div className="absolute hidden xl:block animate-float-x-delay-4"
           style={{ top: '30%', right: '3%' }}>
        <WidgetReservation />
      </div>

      {/* ════ MODAL CONFIRMATION ═══════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in-up">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-lg ${
              modalType === 'email'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              {modalType === 'email'
                ? <Mail className="h-8 w-8 text-white" />
                : <CheckCircle className="h-8 w-8 text-white" />
              }
            </div>

            {modalType === 'email' ? (
              <>
                <h2 className="text-xl font-black text-gray-900 mb-2">Vérifiez votre email</h2>
                <p className="text-sm text-gray-500 mb-1">Un lien de confirmation a été envoyé à :</p>
                <p className="font-black text-indigo-600 text-sm mb-4 break-all">{formData.email}</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Cliquez sur le lien pour activer votre compte.
                  Il est valable <strong className="text-gray-600">24 heures</strong>.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-gray-900 mb-2">Compte créé !</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Votre inscription est complète. Vous pouvez maintenant vous connecter.
                </p>
              </>
            )}

            <button
              onClick={handleModalOk}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-px transition-all duration-200"
            >
              Aller à la connexion
            </button>
          </div>
        </div>
      )}

      {/* ════ CARTE INSCRIPTION ════════════════════════════ */}
      <div className="relative z-10 w-full max-w-xl animate-fade-in-up">

        {/* Barre accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-t-3xl" />

        <div className="bg-white rounded-b-3xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] px-8 py-9">

          {/* En-tête */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg animate-glow-green mb-4">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Créer un compte</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Rejoignez-nous pour commander et réserver
            </p>
            <div className="flex items-center gap-2 w-full mt-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-semibold text-gray-300 px-1">INSCRIPTION</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">

              <Field id="firstName" label="Prénom" icon={User} error={errors.firstName} required>
                <input id="firstName" name="firstName" type="text" required autoComplete="given-name"
                  value={formData.firstName} onChange={handleChange} placeholder="Votre prénom"
                  className={inputCls('firstName')} />
              </Field>

              <Field id="lastName" label="Nom" icon={User} error={errors.lastName} required>
                <input id="lastName" name="lastName" type="text" required autoComplete="family-name"
                  value={formData.lastName} onChange={handleChange} placeholder="Votre nom"
                  className={inputCls('lastName')} />
              </Field>

              <Field id="username" label="Nom d'utilisateur" icon={User} error={errors.username} required>
                <input id="username" name="username" type="text" required autoComplete="username"
                  value={formData.username} onChange={handleChange} placeholder="Votre identifiant"
                  className={inputCls('username')} />
              </Field>

              <Field id="email" label="Email" icon={Mail} error={errors.email} required>
                <input id="email" name="email" type="email" required autoComplete="email"
                  value={formData.email} onChange={handleChange} placeholder="email@exemple.com"
                  className={inputCls('email')} />
              </Field>

              <Field id="phone" label="Téléphone" icon={Phone}>
                <input id="phone" name="phone" type="tel" autoComplete="tel"
                  value={formData.phone} onChange={handleChange} placeholder="+32 468 02 09 86"
                  className={inputCls('phone')} />
              </Field>

              <Field id="address" label="Adresse" icon={MapPin}>
                <input id="address" name="address" type="text" autoComplete="street-address"
                  value={formData.address} onChange={handleChange} placeholder="Adresse complète"
                  className={inputCls('address')} />
              </Field>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Mot de passe <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="password" name="password" type={showPwd ? 'text' : 'password'}
                    required autoComplete="new-password"
                    value={formData.password} onChange={handleChange} placeholder="Minimum 4 caractères"
                    className={inputCls('password').replace('pr-4', 'pr-11')}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.password}</p>}
              </div>

              {/* Confirmer */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Confirmer le mot de passe <span className="text-emerald-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    value={formData.confirmPassword} onChange={handleChange} placeholder="Répétez le mot de passe"
                    className={inputCls('confirmPassword').replace('pr-4', 'pr-11')}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-[11px] text-red-500 font-semibold">{errors.confirmPassword}</p>}
              </div>

            </div>

            {/* Bouton */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-px active:translate-y-0"
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><UserPlus className="h-4 w-4" /> Créer mon compte</>
                )}
              </button>
            </div>
          </form>

          {/* Pied */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
                Se connecter
              </Link>
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-gray-300" />
              <span className="text-[11px] font-medium">Vos données sont protégées · 100 % sécurisé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
