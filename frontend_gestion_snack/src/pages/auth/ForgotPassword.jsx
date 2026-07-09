import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }
    setLoading(true);
    try {
      await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      // Toujours rediriger (même si l'email n'existe pas - sécurité)
      sessionStorage.setItem('resetEmail', email);
      navigate('/verify-reset-code');
    } catch (error) {
      const message = error.response?.data?.message || "Erreur lors de l'envoi du code";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Lock className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Mot de passe oublié</h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez votre email. Un code à 6 chiffres vous sera envoyé pour vérifier votre identité.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              'Envoyer le code de vérification'
            )}
          </button>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
