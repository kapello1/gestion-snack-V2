import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, ShoppingCart, Filter, Utensils, Droplets, Sparkles, X, AlertCircle, Plus, Check } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, PRODUCT_TYPE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import { wsManager } from '../../lib/wsManager';
import StarRating from '../../components/StarRating';

const FALLBACK_SAUCES = [
  { sauceId: 'f1', name: 'Mayonnaise belge', price: 0.50 },
  { sauceId: 'f2', name: 'Sauce américaine', price: 0.50 },
  { sauceId: 'f3', name: 'Sauce andalouse', price: 0.50 },
  { sauceId: 'f4', name: 'Sauce cocktail', price: 0.50 },
  { sauceId: 'f5', name: 'Sauce samouraï', price: 0.60 },
  { sauceId: 'f6', name: 'Ketchup', price: 0.30 },
];
const FALLBACK_VIANDES = [
  { viandeId: 'f1', name: 'Bœuf haché', price: 2.50 },
  { viandeId: 'f2', name: 'Poulet', price: 2.00 },
  { viandeId: 'f3', name: 'Merguez', price: 2.50 },
  { viandeId: 'f4', name: 'Fricadelle', price: 1.50 },
  { viandeId: 'f5', name: 'Jambon', price: 1.80 },
  { viandeId: 'f6', name: 'Charcuterie mixte', price: 2.20 },
];
const FALLBACK_DESSERTS = [
  { dessertId: 'f1', name: 'Gaufre belge', price: 2.50 },
  { dessertId: 'f2', name: 'Spéculoos glacé', price: 2.00 },
  { dessertId: 'f3', name: 'Pralines belges', price: 3.00 },
  { dessertId: 'f4', name: 'Tiramisu', price: 3.50 },
  { dessertId: 'f5', name: 'Crème brûlée', price: 3.00 },
  { dessertId: 'f6', name: 'Mousse au chocolat', price: 2.80 },
];

const MenuPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productRating, setProductRating] = useState({});
  const [customerReviews, setCustomerReviews] = useState([]);

  // Extras data
  const [sauces, setSauces] = useState([]);
  const [desserts, setDesserts] = useState([]);
  const [viandes, setViandes] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [selectedViandes, setSelectedViandes] = useState([]);
  const [selectedDesserts, setSelectedDesserts] = useState([]);

  const loadExtras = async () => {
    try {
      const [s, d, v] = await Promise.allSettled([
        api.get(API_ENDPOINTS.SAUCES.AVAILABLE),
        api.get(API_ENDPOINTS.DESSERTS.AVAILABLE),
        api.get(API_ENDPOINTS.VIANDES.AVAILABLE),
      ]);
      const saucesData = s.status === 'fulfilled' && s.value.data?.length > 0 ? s.value.data : FALLBACK_SAUCES;
      const dessertsData = d.status === 'fulfilled' && d.value.data?.length > 0 ? d.value.data : FALLBACK_DESSERTS;
      const viandesData = v.status === 'fulfilled' && v.value.data?.length > 0 ? v.value.data : FALLBACK_VIANDES;
      setSauces(saucesData);
      setDesserts(dessertsData);
      setViandes(viandesData);
    } catch (e) {
      console.error('Erreur chargement extras:', e);
      setSauces(FALLBACK_SAUCES);
      setDesserts(FALLBACK_DESSERTS);
      setViandes(FALLBACK_VIANDES);
    }
  };

  const loadCustomerReviews = async () => {
    if (!user?.ownerId) return;
    try {
      const response = await api.get(`/reviews/customer/${user.ownerId}`);
      setCustomerReviews(response.data || []);
      const ratings = {};
      response.data.forEach(review => {
        if (review.productId) ratings[review.productId] = review.star;
      });
      setProductRating(ratings);
    } catch (e) {
      console.error('Erreur lors du chargement des notes:', e);
    }
  };

  useEffect(() => {
    loadProducts(true);
    loadCustomerReviews();
    loadExtras();
  }, [user]);

  // Rafraîchissement instantané et silencieux sur tout événement WebSocket
  useEffect(() => {
    return wsManager.onEvent(() => loadProducts(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { filterProducts(); }, [searchTerm, selectedType, products]);
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  // Reset extras when modal opens
  useEffect(() => {
    if (selectedProduct) {
      setSelectedSauces([]);
      setSelectedViandes([]);
      setSelectedDesserts([]);
    }
  }, [selectedProduct]);

  const loadProducts = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(API_ENDPOINTS.PRODUCTS.BASE);
      setProducts(response.data || []);
    } catch (error) {
      if (showLoading) toast.error('Erreur lors du chargement du menu');
      else throw error;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p => p.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedType) {
      filtered = filtered.filter(p => p.productType === selectedType);
    }
    setFilteredProducts(filtered);
  };

  // Calcul du prix total d'un item (produit + extras sélectionnés)
  const computeItemPrice = (product, sauceSel, viandeSel, dessertSel) => {
    let base = Number(product.unitPrice) || 0;
    const extrasSum =
      sauceSel.reduce((acc, s) => acc + Number(s.price), 0) +
      viandeSel.reduce((acc, v) => acc + Number(v.price), 0) +
      dessertSel.reduce((acc, d) => acc + Number(d.price), 0);
    return base + extrasSum;
  };

  const extrasTotal = () =>
    selectedSauces.reduce((a, s) => a + Number(s.price), 0) +
    selectedViandes.reduce((a, v) => a + Number(v.price), 0) +
    selectedDesserts.reduce((a, d) => a + Number(d.price), 0);

  const totalModalPrice = selectedProduct
    ? Number(selectedProduct.unitPrice) + extrasTotal()
    : 0;

  const toggleExtra = (list, setList, item, idKey) => {
    setList(prev =>
      prev.some(i => i[idKey] === item[idKey])
        ? prev.filter(i => i[idKey] !== item[idKey])
        : [...prev, item]
    );
  };

  const addToCart = (product, sauceSel = [], viandeSel = [], dessertSel = []) => {
    if (product.quantityAvailable <= 0) {
      toast.error(t('menu.outOfStockMsg'));
      return;
    }

    const totalPrice = computeItemPrice(product, sauceSel, viandeSel, dessertSel);
    const extrasLabel = [
      ...sauceSel.map(s => s.name),
      ...viandeSel.map(v => v.name),
      ...dessertSel.map(d => d.name),
    ].join(', ');

    // On identifie un item de panier par productId + extras combinés
    const cartKey = `${product.productId}_${extrasLabel}`;
    const existingItem = cart.find(item => item.cartKey === cartKey);

    if (existingItem) {
      if (existingItem.quantity < product.quantityAvailable) {
        setCart(cart.map(item =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
        toast.success(`${product.productName} ajouté au panier (+1)`);
      } else {
        toast.warning(`Limite de stock atteinte pour ${product.productName}`);
      }
    } else {
      setCart([...cart, {
        cartKey,
        productId: product.productId,
        productName: product.productName,
        unitPrice: totalPrice,
        basePrice: Number(product.unitPrice),
        extras: extrasLabel,
        sauces: sauceSel,
        viandes: viandeSel,
        desserts: dessertSel,
        quantity: 1,
      }]);
      toast.success(`${product.productName} ajouté au panier`);
    }
  };

  const getCartTotal = () => cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) { toast.warning('Votre panier est vide'); return; }
    navigate('/customer/checkout');
  };

  const handleProductRatingChange = async (productId, value) => {
    if (!user?.ownerId) { toast.warning('Vous devez être connecté pour noter un produit.'); return; }
    try {
      const existingReview = customerReviews.find(r => r.productId === productId);
      if (existingReview) {
        await api.put(`/reviews/${existingReview.reviewId}`, {
          customerId: user.ownerId, productId, star: value,
          comment: existingReview.comment || '', createdBy: user.username
        });
      } else {
        await api.post('/reviews', {
          customerId: user.ownerId, productId, star: value,
          comment: '', createdBy: user.username
        });
      }
      setProductRating(prev => ({ ...prev, [productId]: value }));
      toast.success(`Merci ! ${value} étoiles attribuées.`);
      loadCustomerReviews();
      loadProducts(false);
    } catch (error) {
      console.error('Erreur lors de la notation:', error);
      toast.error('Erreur lors de la sauvegarde de votre note.');
    }
  };

  const foodProducts = filteredProducts.filter(p => p.productType === PRODUCT_TYPE.FOOD);
  const drinkProducts = filteredProducts.filter(p => p.productType === PRODUCT_TYPE.DRINK);

  const EXTRA_COLOR_CLASSES = {
    red:    { outer: 'border-red-400 bg-red-50 text-red-800',       inner: 'border-red-500 bg-red-500',       price: 'text-red-700' },
    orange: { outer: 'border-orange-400 bg-orange-50 text-orange-800', inner: 'border-orange-500 bg-orange-500', price: 'text-orange-700' },
    purple: { outer: 'border-purple-400 bg-purple-50 text-purple-800', inner: 'border-purple-500 bg-purple-500', price: 'text-purple-700' },
    blue:   { outer: 'border-blue-400 bg-blue-50 text-blue-800',    inner: 'border-blue-500 bg-blue-500',    price: 'text-blue-700' },
  };

  const ExtraCheckbox = ({ item, idKey, selected, onToggle, color = 'blue' }) => {
    const isSelected = selected.some(i => i[idKey] === item[idKey]);
    const cls = EXTRA_COLOR_CLASSES[color] || EXTRA_COLOR_CLASSES.blue;
    return (
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all text-sm
          ${isSelected ? cls.outer : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
            ${isSelected ? cls.inner : 'border-gray-300'}`}>
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="font-medium">{item.name}</span>
        </div>
        <span className={`font-bold text-xs ${isSelected ? cls.price : 'text-gray-500'}`}>
          +{Number(item.price).toFixed(2)} €
        </span>
      </button>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <Utensils className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-gray-500 font-bold text-xl animate-pulse">{t('menu.title')}...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative bg-blue-600 py-12 px-4 mb-8 overflow-hidden rounded-b-[3rem] shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 opacity-10">
          <Utensils className="h-64 w-64 text-white rotate-12" />
        </div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 opacity-10">
          <Droplets className="h-64 w-64 text-white -rotate-12" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
              {t('menu.title')} <br /><span className="text-yellow-400">{t('menu.titleHighlight')}</span>
            </h1>
            <p className="text-blue-100 text-lg font-medium max-w-md">{t('menu.subtitle')}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center">
            <div className="bg-white text-blue-600 p-4 rounded-full mb-4 shadow-xl">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <p className="text-white font-black text-3xl mb-2">{getCartTotal().toFixed(2)} €</p>
            <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-6">
              {cart.length} {cart.length > 1 ? t('menu.articles') : t('menu.article')}
            </p>
            <button
              onClick={handleCheckout}
              className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black rounded-2xl transition-all shadow-lg active:scale-95"
            >
              {t('menu.checkout')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        {/* Barre de recherche */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-12 -mt-10 relative z-20 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('menu.search')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Filter className="h-6 w-6 text-gray-400" />
              </div>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="block w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium appearance-none cursor-pointer"
              >
                <option value="">{t('menu.allCategories')}</option>
                {Object.entries(LABELS.PRODUCT_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section Nourriture */}
        {(selectedType === '' || selectedType === PRODUCT_TYPE.FOOD) && foodProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <Utensils className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('menu.ourDishes')}</h2>
                <div className="h-1 w-12 bg-orange-500 rounded-full mt-1"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {foodProducts.map(product => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  showCartButton={true}
                  onAddToCart={p => addToCart(p)}
                  onProductClick={p => setSelectedProduct(p)}
                  isInCart={cart.some(i => i.productId === product.productId)}
                  cartQuantity={cart.filter(i => i.productId === product.productId).reduce((a, b) => a + b.quantity, 0)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section Boissons */}
        {(selectedType === '' || selectedType === PRODUCT_TYPE.DRINK) && drinkProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-sky-100 rounded-2xl">
                <Droplets className="h-8 w-8 text-sky-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('menu.freshDrinks')}</h2>
                <div className="h-1 w-12 bg-sky-500 rounded-full mt-1"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {drinkProducts.map(product => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  showCartButton={true}
                  onAddToCart={p => addToCart(p)}
                  onProductClick={p => setSelectedProduct(p)}
                  isInCart={cart.some(i => i.productId === product.productId)}
                  cartQuantity={cart.filter(i => i.productId === product.productId).reduce((a, b) => a + b.quantity, 0)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
            <Sparkles className="h-20 w-20 text-gray-200 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-400">{t('menu.nothingFound')}</h3>
            <p className="text-gray-400 mt-2">{t('menu.tryAnother')}</p>
          </div>
        )}
      </div>

      {/* Modal Détails Produit avec Extras */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-100">
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{t('menu.productDetails')}</span>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedProduct.productName}</h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2.5 hover:bg-gray-100 rounded-full transition-colors shadow-sm bg-white">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Corps */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="relative h-56 rounded-3xl overflow-hidden bg-gray-50 shadow-md border border-gray-100">
                  <img
                    src={selectedProduct.imageUrl || (selectedProduct.productType === PRODUCT_TYPE.DRINK
                      ? 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80'
                      : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80')}
                    alt={selectedProduct.productName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200/50 px-4 py-1.5 rounded-full text-xs font-bold text-gray-800 shadow">
                    {LABELS.PRODUCT_TYPE[selectedProduct.productType]}
                  </div>
                </div>

                {/* Infos produit */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1">{t('menu.unitPrice')}</span>
                    <p className="text-3xl font-black text-blue-600">{Number(selectedProduct.unitPrice).toFixed(2)} €</p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1">{t('menu.availability')}</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedProduct.quantityAvailable <= 0
                        ? 'bg-red-100 text-red-700'
                        : selectedProduct.quantityAvailable <= selectedProduct.alertThreshold
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedProduct.quantityAvailable <= 0
                        ? t('menu.outOfStock')
                        : selectedProduct.quantityAvailable <= selectedProduct.alertThreshold
                          ? `${t('menu.lowStock')} (${selectedProduct.quantityAvailable})`
                          : `${t('menu.available')} (${selectedProduct.quantityAvailable})`}
                    </span>
                  </div>

                  {selectedProduct.description && (
                    <div>
                      <span className="text-xs font-bold text-gray-400 block mb-1">{t('menu.description')}</span>
                      <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1">{t('menu.allergens')}</span>
                    {selectedProduct.alergy ? (
                      <p className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-2xl flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        {selectedProduct.alergy}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-2xl">
                        ✓ {t('menu.noAllergens')}
                      </p>
                    )}
                  </div>

                  {/* Note étoiles */}
                  <div className="bg-blue-50/50 border border-blue-100/50 p-3 rounded-2xl">
                    <span className="text-xs font-bold text-blue-800 block mb-1">{t('menu.yourRating')}</span>
                    <StarRating
                      value={productRating[selectedProduct.productId] || 0}
                      readOnly={false}
                      size="lg"
                      onChange={val => handleProductRatingChange(selectedProduct.productId, val)}
                    />
                    {productRating[selectedProduct.productId] && (
                      <p className="text-[10px] text-blue-600 font-semibold italic mt-1">
                        {t('menu.ratedWith')} {productRating[selectedProduct.productId]} {t('menu.stars')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section Extras */}
              <div className="bg-gray-50 rounded-3xl p-5 space-y-5 border border-gray-100">
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  {t('menu.extras')}
                </h3>

                {/* Viandes - pour les plats (sauf si explicitement désactivé) */}
                {selectedProduct.needsViande !== false && selectedProduct.productType === PRODUCT_TYPE.FOOD && viandes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🥩 {t('menu.chooseViandes')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {viandes.map(v => (
                        <ExtraCheckbox
                          key={v.viandeId}
                          item={v}
                          idKey="viandeId"
                          selected={selectedViandes}
                          onToggle={item => toggleExtra(selectedViandes, setSelectedViandes, item, 'viandeId')}
                          color="red"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sauces - pour les plats (sauf si explicitement désactivé) */}
                {selectedProduct.needsSauce !== false && selectedProduct.productType === PRODUCT_TYPE.FOOD && sauces.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🫙 {t('menu.chooseSauces')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sauces.map(s => (
                        <ExtraCheckbox
                          key={s.sauceId}
                          item={s}
                          idKey="sauceId"
                          selected={selectedSauces}
                          onToggle={item => toggleExtra(selectedSauces, setSelectedSauces, item, 'sauceId')}
                          color="orange"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Desserts - toujours disponibles pour tous les produits */}
                {desserts.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🍰 {t('menu.chooseDesserts')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {desserts.map(d => (
                        <ExtraCheckbox
                          key={d.dessertId}
                          item={d}
                          idKey="dessertId"
                          selected={selectedDesserts}
                          onToggle={item => toggleExtra(selectedDesserts, setSelectedDesserts, item, 'dessertId')}
                          color="purple"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Récapitulatif des prix */}
              <div className="bg-blue-600 rounded-2xl p-4 text-white">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-200">{t('menu.basePrice')}</span>
                  <span className="font-semibold">{Number(selectedProduct.unitPrice).toFixed(2)} €</span>
                </div>
                {extrasTotal() > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200">{t('menu.extrasTotal')}</span>
                    <span className="font-semibold">+{extrasTotal().toFixed(2)} €</span>
                  </div>
                )}
                <div className="border-t border-blue-500 mt-2 pt-2 flex justify-between">
                  <span className="font-black text-base">{t('menu.totalPrice')}</span>
                  <span className="font-black text-2xl">{totalModalPrice.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 pb-6 pt-2 flex gap-4 flex-shrink-0 border-t border-gray-100 bg-white">
              <button
                disabled={selectedProduct.quantityAvailable <= 0}
                onClick={() => {
                  addToCart(selectedProduct, selectedSauces, selectedViandes, selectedDesserts);
                  setSelectedProduct(null);
                }}
                className="flex-1 flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{selectedProduct.quantityAvailable <= 0 ? t('menu.unavailable') : `${t('menu.addToCart')} — ${totalModalPrice.toFixed(2)} €`}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all font-bold active:scale-95"
              >
                {t('menu.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-8 right-24 z-40 md:hidden">
          <button
            onClick={handleCheckout}
            className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white font-black rounded-full shadow-2xl animate-bounce"
          >
            <ShoppingCart className="h-6 w-6" />
            <span>{getCartTotal().toFixed(2)} €</span>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default MenuPage;
