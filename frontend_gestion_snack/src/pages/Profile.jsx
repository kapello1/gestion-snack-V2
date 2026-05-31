// Page de profil pour tous les utilisateurs
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Save, Edit } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import Layout from '../components/layout/Layout';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Charger les données selon le type d'utilisateur
      let response;
      if (user.roleName === 'CUSTOMER') {
        response = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(user.ownerId));
      } else if (user.roleName === 'PROVIDER') {
        response = await api.get(API_ENDPOINTS.PROVIDERS.BY_ID(user.ownerId));
      } else if (['CASHIER', 'WAITER', 'COOK', 'ADMIN'].includes(user.roleName)) {
        response = await api.get(API_ENDPOINTS.EMPLOYEES.BY_ID(user.ownerId));
      }

      if (response?.data) {
        setProfileData(response.data);
        setFormData({
          username: response.data.username || user.username,
          email: response.data.email || user.email,
          phone: response.data.phone || '',
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          address: response.data.address || '',
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Erreur lors du chargement du profil');
    }
  };

  const handleProfileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhoneChange = (value) => {
    setFormData({
      ...formData,
      phone: value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      const updatePayload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        updatedBy: user.username,
      };

      if (user.roleName === 'CUSTOMER') {
        // Mettre à jour le client
        response = await api.put(API_ENDPOINTS.CUSTOMERS.BY_ID(user.ownerId), {
          ...profileData,
          ...updatePayload,
        });
      } else if (user.roleName === 'PROVIDER') {
        response = await api.put(API_ENDPOINTS.PROVIDERS.BY_ID(user.ownerId), {
          ...profileData,
          ...updatePayload,
        });
      } else if (['CASHIER', 'WAITER', 'COOK', 'ADMIN'].includes(user.roleName)) {
        response = await api.put(API_ENDPOINTS.EMPLOYEES.BY_ID(user.ownerId), {
          ...profileData,
          ...updatePayload,
        });
      }

      if (response?.data) {
        // Mettre à jour le context avec les nouvelles données
        updateUser({
          ...user,
          username: formData.username,
          email: formData.email,
        });

        toast.success('Profil mis à jour avec succès');
        setEditMode(false);
        loadProfile();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du profil';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setPasswordLoading(true);

    try {
      // Vérifier le mot de passe actuel en tentant une connexion
      const loginResponse = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        username: user.username,
        password: passwordData.currentPassword,
      });

      if (loginResponse.data && loginResponse.data.success) {
        // Mettre à jour le mot de passe
        await api.post(API_ENDPOINTS.USERS.CHANGE_PASSWORD(user.userId), {
          newPassword: passwordData.newPassword,
        });

        toast.success('Mot de passe mis à jour avec succès');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error('Mot de passe actuel incorrect');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du mot de passe';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user || !profileData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Mon profil</h1>

          {/* Informations du profil */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Informations personnelles</h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modifier</span>
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom d'utilisateur
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleProfileChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleProfileChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleProfileChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleProfileChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleProfileChange}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <div className="phone-input-container">
                      <PhoneInput
                        placeholder="Entrez votre numéro"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        defaultCountry="BE"
                        className="block w-full py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Afficher les autres informations en lecture seule */}
                {profileData.firstName && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Prénom:</span> {profileData.firstName}
                  </div>
                )}
                {profileData.lastName && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Nom:</span> {profileData.lastName}
                  </div>
                )}
                {profileData.address && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Adresse:</span> {profileData.address}
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      loadProfile();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Nom d'utilisateur:</span>
                    <span className="ml-2 font-medium">{profileData.username || user.username}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{profileData.email || user.email}</span>
                  </div>
                </div>
                {profileData.firstName && (
                  <div>
                    <span className="text-sm text-gray-600">Prénom:</span>
                    <span className="ml-2 font-medium">{profileData.firstName}</span>
                  </div>
                )}
                {profileData.lastName && (
                  <div>
                    <span className="text-sm text-gray-600">Nom:</span>
                    <span className="ml-2 font-medium">{profileData.lastName}</span>
                  </div>
                )}
                {profileData.phone && (
                  <div>
                    <span className="text-sm text-gray-600">Téléphone:</span>
                    <span className="ml-2 font-medium">{profileData.phone}</span>
                  </div>
                )}
                {profileData.address && (
                  <div>
                    <span className="text-sm text-gray-600">Adresse:</span>
                    <span className="ml-2 font-medium">{profileData.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Changement de mot de passe */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Changer le mot de passe</h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={4}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={4}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{passwordLoading ? 'Mise à jour...' : 'Changer le mot de passe'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;

