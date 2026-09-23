// Utilitaires pour les appels API
import axios from 'axios';
import { toast } from 'react-toastify';
import { apiConfig } from '../config/api';
import { getToken, clearToken } from './authToken';

// Instance Axios configurée
const api = axios.create(apiConfig);

// Joint le jeton JWT à chaque requête : le backend refuse (401) tout appel non public sans jeton valide.
// Les appels /auth/* (connexion, code 2FA, mot de passe oublié) sont publics : on n'y joint jamais de jeton,
// car le backend rejetterait un ancien jeton invalide même sur une route publique.
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !config.url?.startsWith('/auth/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gestion globale des erreurs d'authentification et d'autorisation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && localStorage.getItem('user')) {
      // Jeton expiré, invalide, ou compte désactivé : retour à la connexion
      clearToken();
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (status === 403) {
      // Rôle insuffisant pour cette action (le backend est la référence, pas l'interface)
      toast.error(error.response?.data?.message || 'Accès refusé', { toastId: 'forbidden' });
    }
    return Promise.reject(error);
  }
);

export default api;
