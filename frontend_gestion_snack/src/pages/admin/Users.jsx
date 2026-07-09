import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, Trash2, Edit, UserPlus, User, UserCheck, Truck, UserX,
  X, Mail, Shield, Clock, Hash, Calendar, Lock,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { wsManager } from '../../lib/wsManager';

const ROLE_COLORS = {
  ADMIN:    'bg-red-100 text-red-800',
  WAITER:   'bg-blue-100 text-blue-800',
  COOK:     'bg-orange-100 text-orange-800',
  CUSTOMER: 'bg-green-100 text-green-800',
  PROVIDER: 'bg-purple-100 text-purple-800',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '-';

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
    <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
    <span className="text-sm font-semibold text-gray-800 truncate">{value || '-'}</span>
  </div>
);

const UsersPage = () => {
  const navigate = useNavigate();
  const [users,          setUsers]          = useState([]);
  const [filteredUsers,  setFilteredUsers]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [editingUser,    setEditingUser]    = useState(null);
  const [saving,         setSaving]         = useState(false);

  const [editFormData, setEditFormData] = useState({ username: '', email: '', roleId: null });
  const [rolesList,    setRolesList]    = useState([]);

  useEffect(() => {
    loadUsers(true);
    api.get(API_ENDPOINTS.ROLES.BASE)
      .then(res => setRolesList(res.data || []))
      .catch(() => setRolesList([]));
  }, []);

  useEffect(() => { return wsManager.onEvent(() => loadUsers(false)); }, []); // eslint-disable-line
  useEffect(() => { filterUsers(); }, [searchTerm, users]); // eslint-disable-line

  const loadUsers = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(API_ENDPOINTS.USERS.BASE);
      setUsers(res.data || []);
    } catch {
      if (showLoading) toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) { setFilteredUsers(users); return; }
    const q = searchTerm.toLowerCase();
    setFilteredUsers(users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roleName?.toLowerCase().includes(q)
    ));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await api.delete(API_ENDPOINTS.USERS.BY_ID(id));
      toast.success('Utilisateur supprime');
      loadUsers(false);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditFormData({
      username: u.username  || '',
      email:    u.email     || '',
      roleId:   u.roleId    ?? null,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.username.trim()) { toast.error("Le nom d'utilisateur est obligatoire"); return; }
    if (!editFormData.email.trim())    { toast.error("L'email est obligatoire"); return; }
    if (!editFormData.roleId)          { toast.error('Veuillez selectionner un role'); return; }

    setSaving(true);
    try {
      await api.put(API_ENDPOINTS.USERS.BY_ID(editingUser.userId), {
        username: editFormData.username.trim(),
        email:    editFormData.email.trim(),
        roleId:   Number(editFormData.roleId),
        ownerId:  editingUser.ownerId ?? null,
      });
      toast.success('Utilisateur mis a jour');
      setShowEditModal(false);
      loadUsers(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la mise a jour');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    const isActive = u.isActive !== false;
    const action   = isActive ? 'desactiver' : 'reactiver';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${u.username}" ?`)) return;
    try {
      const ep = isActive ? API_ENDPOINTS.USERS.DEACTIVATE(u.userId) : API_ENDPOINTS.USERS.ACTIVATE(u.userId);
      await api.patch(ep);
      toast.success(isActive ? 'Compte desactive' : 'Compte reactive');
      loadUsers(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors du changement de statut');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Utilisateurs</h1>
            <p className="text-sm text-gray-500 mt-0.5">Administration des comptes d'acces</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm"
          >
            <UserPlus className="h-4 w-4" /> Creer un utilisateur
          </button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['ADMIN', 'WAITER', 'COOK', 'CUSTOMER'].map(role => {
            const count = users.filter(u => u.roleName === role).length;
            return (
              <div key={role} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{role}</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#ID', 'Utilisateur', 'Role', 'Statut', 'Derniere connexion', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">#{u.userId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.username}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.roleName] || 'bg-gray-100 text-gray-600'}`}>
                        {u.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                        ${u.isActive === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.isActive === false ? 'Desactive' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive === false ? 'Reactiver' : 'Desactiver'}
                          className={`p-1.5 rounded-lg transition-colors
                            ${u.isActive === false
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-orange-500 hover:bg-orange-50'}`}
                        >
                          {u.isActive === false ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.userId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── MODAL CREATION TYPE ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Creer un utilisateur</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">Quel type d'utilisateur voulez-vous creer ?</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleCreateRedirect('EMPLOYEE')}
                className="w-full p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 flex items-center gap-3 transition-all text-left"
              >
                <div className="bg-blue-100 p-2.5 rounded-xl"><UserCheck className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="font-bold text-gray-900">Employe</p>
                  <p className="text-xs text-gray-500">Serveur, Cuisinier, Admin...</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCreateRedirect('PROVIDER')}
                className="w-full p-4 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 flex items-center gap-3 transition-all text-left"
              >
                <div className="bg-purple-100 p-2.5 rounded-xl"><Truck className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <p className="font-bold text-gray-900">Fournisseur</p>
                  <p className="text-xs text-gray-500">Partenaire externe</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITION ── */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">Modifier l'utilisateur</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Informations actuelles (lecture seule) */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations du compte</p>
              <InfoRow icon={Hash}     label="ID utilisateur"    value={`#${editingUser.userId}`} />
              <InfoRow icon={User}     label="Nom d'utilisateur" value={editingUser.username} />
              <InfoRow icon={Mail}     label="Email"             value={editingUser.email} />
              <InfoRow icon={Shield}   label="Role actuel"       value={editingUser.roleName} />
              <InfoRow icon={Clock}    label="Derniere connexion" value={fmtDate(editingUser.lastLogin)} />
              <InfoRow icon={Calendar} label="Cree le"           value={fmtDate(editingUser.createdAt)} />
              <InfoRow icon={Lock}     label="Statut"            value={editingUser.isActive === false ? 'Desactive' : 'Actif'} />
              {editingUser.pinUpToDate !== undefined && (
                <InfoRow icon={Shield} label="PIN a jour"        value={editingUser.pinUpToDate ? 'Oui' : 'Non'} />
              )}
            </div>

            {/* Champs modifiables */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modifier les informations</p>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.username}
                  onChange={e => setEditFormData(p => ({ ...p, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={e => setEditFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Role *
                </label>
                {rolesList.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-red-500">Erreur de chargement des roles.</p>
                    <button
                      type="button"
                      onClick={() =>
                        api.get(API_ENDPOINTS.ROLES.BASE)
                          .then(res => setRolesList(res.data || []))
                          .catch(() => toast.error('Toujours impossible de charger les roles'))
                      }
                      className="text-xs text-blue-600 underline font-semibold"
                    >
                      Recharger
                    </button>
                  </div>
                ) : (
                  <select
                    value={editFormData.roleId ?? ''}
                    onChange={e => setEditFormData(p => ({ ...p, roleId: Number(e.target.value) }))}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selectionner un role</option>
                    {rolesList.map(r => (
                      <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || rolesList.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {saving ? 'Enregistrement...' : 'Mettre a jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UsersPage;
