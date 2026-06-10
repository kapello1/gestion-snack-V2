// Context d'authentification
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'react-toastify';
import { wsManager } from '../lib/wsManager';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-logout constant
  const AUTO_LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes of inactivity

  // Activity tracking function
  const resetTimer = () => {
    if (user) {
      clearTimeout(window.logoutTimer);
      window.logoutTimer = setTimeout(() => {
        logout();
        toast.info('Déconnexion automatique pour inactivité.');
      }, AUTO_LOGOUT_TIME);
    }
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    const handleActivity = () => resetTimer();

    if (user) {
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetTimer(); // Initialize timer on login
    }

    return () => {
      clearTimeout(window.logoutTimer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user]); // Re-run when user changes (login/logout)

  // Charger l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Reconnexion WebSocket si la session est toujours active
        wsManager.connect(parsedUser.userId);
      } catch (error) {
        console.error('Erreur lors du parsing de l\'utilisateur:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Connexion d'un utilisateur
   */
  const login = async (username, password) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        username,
        password,
      });

      if (response.data && response.data.success) {
        const userData = {
          userId: response.data.userId,
          username: response.data.username,
          email: response.data.email,
          roleName: response.data.roleName,
          roleId: response.data.roleId,
          ownerId: response.data.ownerId,
        };

        // Stocker les données utilisateur (le backend n'utilise pas de token JWT pour l'instant)
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', 'authenticated');

        setUser(userData);
        wsManager.connect(userData.userId); // Ouvre la connexion WebSocket temps réel
        toast.success('Connexion réussie !');
        return { success: true, data: userData };
      } else {
        toast.error(response.data?.message || 'Échec de la connexion');
        return { success: false, message: response.data?.message || 'Échec de la connexion' };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de la connexion';
      toast.error(message);
      return { success: false, message };
    }
  };

  /**
   * Déconnexion d'un utilisateur
   */
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    clearTimeout(window.logoutTimer);
    wsManager.disconnect(); // Ferme proprement la connexion WebSocket
    setUser(null);
    toast.info('Déconnexion réussie');
  };

  /**
   * Réinitialisation du mot de passe — désormais gérée via la page ForgotPassword (email + token)
   * Cette méthode reste pour compatibilité mais n'est plus utilisée directement
   */
  const resetPassword = async () => {
    return { success: false, message: 'Utilisez la page Mot de passe oublié.' };
  };

  /**
   * Mettre à jour les informations utilisateur
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    resetPassword,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

