import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, Plus, Edit, Trash2, Truck, Mail, Phone, MapPin, Clock, Tag, X,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { wsManager } from '../../lib/wsManager';

const EMPTY_FORM = {
  name:          '',
  email:         '',
  phone:         '',
  address:       '',
  providerType:  '',
  deliveryDelay: '',
};

const ProvidersPage = () => {
  const { user } = useAuth();
  const [providers,         setProviders]         = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [showModal,         setShowModal]         = useState(false);
  const [editingProvider,   setEditingProvider]   = useState(null);
  const [saving,            setSaving]            = useState(false);
  const [formData,          setFormData]          = useState(EMPTY_FORM);

  useEffect(() => { loadProviders(true); }, []);
  useEffect(() => { return wsManager.onEvent(() => loadProviders(false)); }, []); // eslint-disable-line
  useEffect(() => { filterProviders(); }, [searchTerm, providers]); // eslint-disable-line

  const loadProviders = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(API_ENDPOINTS.PROVIDERS.BASE);
      setProviders(res.data || []);
    } catch {
      if (showLoading) toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filterProviders = () => {
    if (!searchTerm.trim()) { setFilteredProviders(providers); return; }
    const q = searchTerm.toLowerCase();
    setFilteredProviders(providers.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.providerType?.toLowerCase().includes(q)
    ));
  };

  const openAdd = () => {
    setEditingProvider(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name:          provider.name          || '',
      email:         provider.email         || '',
      phone:         provider.phone         || '',
      address:       provider.address       || '',
      providerType:  provider.providerType  || '',
      deliveryDelay: provider.deliveryDelay || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      await api.delete(API_ENDPOINTS.PROVIDERS.BY_ID(id));
      toast.success('Fournisseur supprime');
      loadProviders(false);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!formData.email.trim()) { toast.error("L'email est obligatoire"); return; }

    setSaving(true);
    try {
      const payload = {
        name:          formData.name.trim(),
        email:         formData.email.trim(),
        phone:         formData.phone.trim()         || null,
        address:       formData.address.trim()       || null,
        providerType:  formData.providerType.trim()  || null,
        deliveryDelay: formData.deliveryDelay.trim() || null,
        createdBy:     user.username,
      };

      if (editingProvider) {
        await api.put(API_ENDPOINTS.PROVIDERS.BY_ID(editingProvider.providerId), payload);
        toast.success('Fournisseur mis a jour');
      } else {
        await api.post(API_ENDPOINTS.PROVIDERS.BASE, payload);
        toast.success('Fournisseur cree');
      }
      setShowModal(false);
      loadProviders(false);
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors && Object.values(err.response.data.errors).join(', '))
        || "Erreur lors de l'enregistrement";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setFormData(p => ({ ...p, [field]: e.target.value }));

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
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
            <h1 className="text-2xl font-black text-gray-900">Fournisseurs</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestion des partenaires d'approvisionnement</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold text-sm"
          >
            <Plus className="h-4 w-4" /> Ajouter un fournisseur
          </button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, type..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Grille fournisseurs */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Aucun fournisseur trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProviders.map(prov => (
              <div
                key={prov.providerId}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-purple-500 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2.5 rounded-xl">
                      <Truck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{prov.name}</h3>
                      {prov.providerType && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                          {prov.providerType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(prov)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(prov.providerId)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {prov.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{prov.email}</span>
                    </div>
                  )}
                  {prov.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span>{prov.phone}</span>
                    </div>
                  )}
                  {prov.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{prov.address}</span>
                    </div>
                  )}
                  {prov.deliveryDelay && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span>Delai : {prov.deliveryDelay}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL FORMULAIRE ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900">
                {editingProvider ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Nom du fournisseur *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={set('name')}
                  placeholder="Ex: Brasserie Dupont, FreshFood SPRL..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={set('email')}
                  placeholder="contact@fournisseur.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Telephone */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={set('phone')}
                    placeholder="+32 ..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Type / Categorie
                  </label>
                  <input
                    type="text"
                    value={formData.providerType}
                    onChange={set('providerType')}
                    placeholder="Boissons, Nourriture..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Delai de livraison */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Delai de livraison
                </label>
                <input
                  type="text"
                  value={formData.deliveryDelay}
                  onChange={set('deliveryDelay')}
                  placeholder="Ex: 2 jours, 48h..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={set('address')}
                  rows={2}
                  placeholder="Rue, ville, code postal..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 text-sm disabled:opacity-60"
                >
                  {saving ? 'Enregistrement...' : (editingProvider ? 'Mettre a jour' : 'Creer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProvidersPage;
