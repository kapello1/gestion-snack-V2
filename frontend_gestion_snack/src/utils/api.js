// Utilitaires pour les appels API
import axios from 'axios';
import { apiConfig } from '../config/api';

// Instance Axios configurée
const api = axios.create(apiConfig);

// Intercepteur pour ajouter les informations d'authentification si nécessaire
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    // Si on a un utilisateur authentifié, on peut ajouter des headers si nécessaire
    // Le backend n'utilise pas de JWT pour l'instant, mais on peut préparer pour le futur
    if (token && user) {
      // Pour l'instant, le backend n'a pas besoin d'un token Bearer
      // On peut ajouter d'autres headers si nécessaire
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Non autorisé - déconnexion
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

