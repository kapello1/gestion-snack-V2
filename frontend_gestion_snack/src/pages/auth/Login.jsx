// Page de connexion
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Mail, Lock, User } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) {
      const roleDashboard = {
        ADMIN: '/admin/dashboard',
        CUSTOMER: '/customer/menu',
        CASHIER: '/cashier/payments',
        WAITER: '/waiter/orders',
        COOK: '/cook/orders',
        PROVIDER: '/provider/orders',
      };
      navigate(roleDashboard[user.roleName] || '/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        // Rediriger selon le rôle
        const roleDashboard = {
          ADMIN: '/admin/dashboard',
          CUSTOMER: '/customer/menu',
          CASHIER: '/cashier/payments',
          WAITER: '/waiter/orders',
          COOK: '/cook/orders',
          PROVIDER: '/provider/orders',
        };
        navigate(roleDashboard[result.data.roleName] || '/dashboard');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Cercles décoratifs animés */}
      <div className="absolute w-64 h-64 bg-white/10 rounded-full -top-8 -left-8 animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute w-96 h-96 bg-white/10 rounded-full -bottom-16 -right-16 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute w-32 h-32 bg-white/10 rounded-full top-1/2 right-16 animate-float" style={{ animationDelay: '4s' }} />
      <div className="absolute w-48 h-48 bg-white/10 rounded-full bottom-16 left-16 animate-float" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <LogIn className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nom d'utilisateur */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Entrez votre nom d'utilisateur"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Entrez votre mot de passe"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

