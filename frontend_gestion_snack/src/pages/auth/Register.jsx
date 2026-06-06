// Page d'inscription (uniquement pour les clients)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Phone, MapPin, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('email'); // 'email' | 'immediate'
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.username.trim()) newErrors.username = "Le nom d'utilisateur est requis";
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Le mot de passe doit contenir au moins 4 caractères';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.CUSTOMERS.BASE, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        address: formData.address || null,
        createdBy: 'SELF',
      });
      if (response.data) {
        // emailVerified=true → compte actif immédiatement (email non configuré ou échec envoi)
        // emailVerified=false → email envoyé, vérification requise
        setModalType(response.data.emailVerified ? 'immediate' : 'email');
        setShowModal(true);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Erreur lors de l'inscription";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = () => {
    setShowModal(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* ── MODAL de confirmation ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in">
            <div className="flex justify-center mb-5">
              <div className={`p-4 rounded-full ${modalType === 'email' ? 'bg-blue-100' : 'bg-green-100'}`}>
                <Mail className={`h-14 w-14 ${modalType === 'email' ? 'text-blue-600' : 'text-green-600'}`} />
              </div>
            </div>

            {modalType === 'email' ? (
              <>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                  Vérifiez votre email !
                </h2>
                <p className="text-gray-600 mb-2 text-base">
                  Un email de confirmation a été envoyé à :
                </p>
                <p className="font-bold text-blue-700 text-lg mb-4 break-all">
                  {formData.email}
                </p>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Ouvrez votre boîte email et cliquez sur le lien de confirmation
                  pour activer votre compte. Le lien est valable <strong>24 heures</strong>.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                  Inscription réussie !
                </h2>
                <p className="text-gray-600 mb-6 text-base">
                  Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
                </p>
              </>
            )}

            <button
              onClick={handleModalOk}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── FORMULAIRE d'inscription ── */}
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Créer un compte</h2>
          <p className="mt-2 text-sm text-gray-600">
            Inscrivez-vous pour passer des commandes et faire des réservations
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Prénom */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input id="firstName" name="firstName" type="text" required value={formData.firstName}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.firstName ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Prénom" />
              </div>
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            {/* Nom */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input id="lastName" name="lastName" type="text" required value={formData.lastName}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.lastName ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Nom" />
              </div>
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>

            {/* Nom d'utilisateur */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input id="username" name="username" type="text" required value={formData.username}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.username ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Nom d'utilisateur" />
              </div>
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input id="email" name="email" type="email" required value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="email@example.com" />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input id="phone" name="phone" type="tel" value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="+32 468 02 09 86" />
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input id="address" name="address" type="text" value={formData.address}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Adresse complète" />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input id="password" name="password" type="password" required value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Minimum 4 caractères" />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input id="confirmPassword" name="confirmPassword" type="password" required
                  value={formData.confirmPassword} onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="Confirmez le mot de passe" />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

          </div>

          <div>
            <button type="submit" disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading
                ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : 'Créer mon compte'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
