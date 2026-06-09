// Page de vérification d'email via token (lien reçu par email)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (!token) {
      setStatus('error');
      setMessage('Token de vérification manquant.');
      return;
    }
    api.get(API_ENDPOINTS.CUSTOMERS.VERIFY_EMAIL(token))
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Email vérifié avec succès !');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Le lien est invalide ou a expiré.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Vérification en cours…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Compte activé !</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Se connecter
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Vérification échouée</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/register"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Créer un nouveau compte
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
