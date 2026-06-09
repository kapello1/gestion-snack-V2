// Page de gestion des produits (Admin)
import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Plus, X, Package, Filter, Image as ImageIcon } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, PRODUCT_TYPE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/ProductCard';
import { wsManager } from '../../lib/wsManager';

const ProductsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    unitPrice: '',
    quantityAvailable: '',
    alertThreshold: '',
    productType: PRODUCT_TYPE.FOOD,
    description: '',
    alergy: '',
    imageUrl: '',
  });

  // Chargement initial
  useEffect(() => {
    loadProducts(true);
  }, []);

  // Rafraîchissement instantané et silencieux sur tout événement WebSocket
  useEffect(() => {
    return wsManager.onEvent(() => loadProducts(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedType, products]);

  const loadProducts = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(API_ENDPOINTS.PRODUCTS.BASE);
      setProducts(response.data || []);
    } catch (error) {
      if (showLoading) toast.error('Erreur lors du chargement des produits');
      else throw error;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.productName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter((product) => product.productType === selectedType);
    }

    setFilteredProducts(filtered);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setSelectedFile(null);
    setFilePreview(product.imageUrl || '');
    setFormData({
      productName: product.productName || '',
      unitPrice: product.unitPrice?.toString() || '',
      quantityAvailable: product.quantityAvailable?.toString() || '',
      alertThreshold: product.alertThreshold?.toString() || '',
      productType: product.productType || PRODUCT_TYPE.FOOD,
      description: product.description || '',
      alergy: product.alergy || '',
      imageUrl: product.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setSelectedFile(null);
    setFilePreview('');
    setFormData({
      productName: '',
      unitPrice: '',
      quantityAvailable: '',
      alertThreshold: '',
      productType: PRODUCT_TYPE.FOOD,
      description: '',
      alergy: '',
      imageUrl: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setUploading(true);
      const payload = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice),
        quantityAvailable: parseInt(formData.quantityAvailable),
        alertThreshold: parseInt(formData.alertThreshold),
        createdBy: user.username,
        updatedBy: user.username,
      };

      let savedProduct;
      if (editingProduct) {
        const response = await api.put(API_ENDPOINTS.PRODUCTS.BY_ID(editingProduct.productId), payload);
        savedProduct = response.data;
      } else {
        const response = await api.post(API_ENDPOINTS.PRODUCTS.BASE, payload);
        savedProduct = response.data;
      }

      // Si un fichier local est sélectionné, l'uploader sur le backend
      if (selectedFile && savedProduct) {
        const formDataPayload = new FormData();
        formDataPayload.append('file', selectedFile);
        await api.post(`${API_ENDPOINTS.PRODUCTS.BASE}/${savedProduct.productId}/upload-image`, formDataPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success(editingProduct ? 'Produit mis à jour avec succès' : 'Produit créé avec succès');
      setShowModal(false);
      loadProducts(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      await api.delete(API_ENDPOINTS.PRODUCTS.BY_ID(productId));
      toast.success('Produit supprimé avec succès');
      loadProducts(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 animate-pulse">Chargement de la carte...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Catalogue Produits</h1>
            <p className="text-gray-500 mt-1 font-medium">Gérez votre stock et vos offres avec précision</p>
          </div>
          <button
            onClick={handleAdd}
            className="group flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-bold">Nouveau Produit</span>
          </button>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
              >
                <option value="">Tous les types</option>
                {Object.entries(LABELS.PRODUCT_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des produits (Grid dynamique) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Package className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-xl font-bold text-gray-400">Aucun produit ne correspond</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                showActions={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Modal d'ajout/édition (Refonte Moderne) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {editingProduct ? 'Modifier le produit' : 'Créer un produit'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">Remplissez les informations ci-dessous</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                {/* Image Preview & Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Illustration du produit</label>
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div 
                      onClick={() => document.getElementById('image-upload-input').click()}
                      className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden flex-shrink-0 group relative cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all duration-300 shadow-sm"
                    >
                      {filePreview || formData.imageUrl ? (
                        <>
                          <img src={filePreview || formData.imageUrl} alt="Preview" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <ImageIcon className="h-6 w-6 text-white mb-1" />
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Changer</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-gray-300 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider text-center px-2">Ajouter</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      id="image-upload-input"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="url"
                        placeholder="Ou collez un lien d'image (ex: https://...)"
                        value={formData.imageUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, imageUrl: e.target.value });
                          setFilePreview('');
                          setSelectedFile(null);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                      />
                      <p className="text-[10px] text-gray-400 font-medium ml-1">
                        {selectedFile ? `Fichier sélectionné : ${selectedFile.name}` : 'Sélectionnez un fichier local ou collez un lien.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Nom du produit *</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Type de produit *</label>
                    <select
                      value={formData.productType}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      required
                    >
                      {Object.entries(LABELS.PRODUCT_TYPE).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
                    placeholder="Brève description pour le menu..."
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                    Allergènes
                    <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
                  </label>
                  <input
                    type="text"
                    value={formData.alergy}
                    onChange={(e) => setFormData({ ...formData, alergy: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    placeholder="Ex: Gluten, Lactose, Arachides..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Prix (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Stock *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantityAvailable}
                      onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Alerte *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.alertThreshold}
                      onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-95 disabled:bg-gray-400"
                  >
                    {uploading ? 'Enregistrement...' : 'Enregistrer le produit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all font-bold active:scale-95"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductsPage;
