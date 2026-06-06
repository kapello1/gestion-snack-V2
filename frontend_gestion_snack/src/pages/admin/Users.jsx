import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Trash2, Edit, UserPlus, Mail, User, UserCheck, Truck, UserX } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../../utils/constants';

const UsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    roleName: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.USERS.BASE);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = users.filter(user =>
      user.username?.toLowerCase().includes(lowerTerm) ||
      user.email?.toLowerCase().includes(lowerTerm) ||
      user.roleName?.toLowerCase().includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await api.delete(API_ENDPOINTS.USERS.BY_ID(id));
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      roleName: user.roleName
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Note: Backend might not support direct user update if it's tied to Employee/Provider
      // But we can try updating basic info if endpoint exists
      // Assuming PUT /users/{id} exists or similar
      await api.put(API_ENDPOINTS.USERS.BY_ID(editingUser.userId), editFormData);
      toast.success('Utilisateur mis à jour');
      setShowEditModal(false);
      loadUsers();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour. Vérifiez si cet utilisateur est lié à un employé/fournisseur.');
    }
  };

  const handleToggleActive = async (user) => {
    const isCurrentlyActive = user.isActive !== false;
    const action = isCurrentlyActive ? 'désactiver' : 'réactiver';
    if (!window.confirm(`Voulez-vous ${action} l'utilisateur "${user.username}" ?`)) return;
    try {
      const endpoint = isCurrentlyActive
        ? API_ENDPOINTS.USERS.DEACTIVATE(user.userId)
        : API_ENDPOINTS.USERS.ACTIVATE(user.userId);
      await api.patch(endpoint);
      toast.success(isCurrentlyActive ? 'Compte désactivé — connexion bloquée' : 'Compte réactivé');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleCreateRedirect = (type) => {
    setShowCreateModal(false);
    if (type === 'EMPLOYEE') navigate('/admin/employees');
    else if (type === 'PROVIDER') navigate('/admin/providers');
  };

  if (loading) {
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
            <p className="text-gray-600 mt-2">Administrer les comptes d'accès</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <UserPlus className="h-5 w-5" />
            Créer un utilisateur
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.roleName === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        user.roleName === 'CUSTOMER' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'}`}>
                      {user.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${user.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {user.isActive === false ? 'Désactivé' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleToggleActive(user)}
                      title={user.isActive === false ? 'Réactiver' : 'Désactiver'}
                      className={`mr-3 ${user.isActive === false ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'}`}
                    >
                      {user.isActive === false ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                    </button>
                    <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(user.userId)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Création Type */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Créer un nouvel utilisateur</h2>
              <p className="text-gray-600 mb-6">Quel type d'utilisateur souhaitez-vous créer ?</p>
              <div className="space-y-3">
                <button onClick={() => handleCreateRedirect('EMPLOYEE')} className="w-full p-4 border rounded-lg hover:bg-blue-50 flex items-center gap-3 transition-colors">
                  <div className="bg-blue-100 p-2 rounded-full"><UserCheck className="h-6 w-6 text-blue-600" /></div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Employé</div>
                    <div className="text-sm text-gray-500">Serveur, Cuisinier, Caissier, Admin</div>
                  </div>
                </button>
                <button onClick={() => handleCreateRedirect('PROVIDER')} className="w-full p-4 border rounded-lg hover:bg-purple-50 flex items-center gap-3 transition-colors">
                  <div className="bg-purple-100 p-2 rounded-full"><Truck className="h-6 w-6 text-purple-600" /></div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Fournisseur</div>
                    <div className="text-sm text-gray-500">Partenaire externe</div>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="mt-6 w-full py-2 text-gray-600 hover:bg-gray-100 rounded-md">Annuler</button>
            </div>
          </div>
        )}

        {/* Modal Édition */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Modifier l'utilisateur</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                  <input type="text" value={editFormData.username} onChange={e => setEditFormData({ ...editFormData, username: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rôle</label>
                  <select value={editFormData.roleName} onChange={e => setEditFormData({ ...editFormData, roleName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    {Object.values(ROLES).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UsersPage;
