import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, UserPlus, X, ShoppingCart, Plus, Minus, Trash2,
  Check, ChevronRight, User, Phone, Utensils, Droplets, Sparkles,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { PRODUCT_TYPE } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Fallback extras ───────────────────────────────────────────────────────────
const FALLBACK_SAUCES   = [
  { sauceId: 'f1', name: 'Mayonnaise belge', price: 0.50 },
  { sauceId: 'f2', name: 'Sauce américaine', price: 0.50 },
  { sauceId: 'f3', name: 'Sauce andalouse',  price: 0.50 },
  { sauceId: 'f4', name: 'Ketchup',          price: 0.30 },
];
const FALLBACK_VIANDES  = [
  { viandeId: 'f1', name: 'Bœuf haché',  price: 2.50 },
  { viandeId: 'f2', name: 'Poulet',      price: 2.00 },
  { viandeId: 'f3', name: 'Merguez',     price: 2.50 },
  { viandeId: 'f4', name: 'Fricadelle',  price: 1.50 },
];
const FALLBACK_DESSERTS = [
  { dessertId: 'f1', name: 'Gaufre belge',   price: 2.50 },
  { dessertId: 'f2', name: 'Spéculoos glacé', price: 2.00 },
  { dessertId: 'f3', name: 'Tiramisu',        price: 3.50 },
];

// ─── ExtraCheckbox ─────────────────────────────────────────────────────────────
const EXTRA_COLORS = {
  orange: { outer: 'border-orange-400 bg-orange-50 text-orange-800', inner: 'border-orange-500 bg-orange-500' },
  red:    { outer: 'border-red-400 bg-red-50 text-red-800',         inner: 'border-red-500 bg-red-500' },
  purple: { outer: 'border-purple-400 bg-purple-50 text-purple-800', inner: 'border-purple-500 bg-purple-500' },
};

const ExtraCheckbox = ({ item, idKey, selected, onToggle, color = 'orange' }) => {
  const isSelected = selected.some(i => i[idKey] === item[idKey]);
  const cls = EXTRA_COLORS[color] || EXTRA_COLORS.orange;
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all text-sm
        ${isSelected ? cls.outer : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
          ${isSelected ? cls.inner : 'border-gray-300'}`}>
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="font-medium">{item.name}</span>
      </div>
      <span className="text-xs font-bold">+{Number(item.price).toFixed(2)} €</span>
    </button>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const WaiterNewOrderPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // ── customer step ──────────────────────────────────────────────────────────
  const [nameQuery,       setNameQuery]       = useState('');
  const [searchResults,   setSearchResults]   = useState([]);
  const [searching,       setSearching]       = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewForm,     setShowNewForm]     = useState(false);
  const [newForm,         setNewForm]         = useState({ firstName: '', lastName: '', phone: '' });
  const [savingCustomer,  setSavingCustomer]  = useState(false);
  const searchTimeout = useRef(null);

  // ── menu ──────────────────────────────────────────────────────────────────
  const [products,         setProducts]         = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loadingProducts,  setLoadingProducts]  = useState(false);
  const [menuSearch,       setMenuSearch]       = useState('');
  const [selectedType,     setSelectedType]     = useState('');

  // ── extras ────────────────────────────────────────────────────────────────
  const [sauces,   setSauces]   = useState([]);
  const [viandes,  setViandes]  = useState([]);
  const [desserts, setDesserts] = useState([]);

  // ── product modal ─────────────────────────────────────────────────────────
  const [modalProduct,    setModalProduct]    = useState(null);
  const [selSauces,       setSelSauces]       = useState([]);
  const [selViandes,      setSelViandes]      = useState([]);
  const [selDesserts,     setSelDesserts]     = useState([]);

  // ── cart (local state, NOT localStorage) ─────────────────────────────────
  const [cart, setCart] = useState([]);

  // ── order form ────────────────────────────────────────────────────────────
  const [freeTables,   setFreeTables]   = useState([]);
  const [tableId,      setTableId]      = useState('');
  const [guestCount,   setGuestCount]   = useState(1);
  const [payMethod,    setPayMethod]    = useState('CASH');
  const [submitting,   setSubmitting]   = useState(false);

  // ── load menu + extras + tables on mount ──────────────────────────────────
  useEffect(() => {
    loadProducts();
    loadExtras();
    loadFreeTables();
  }, []);

  useEffect(() => { filterProducts(); }, [menuSearch, selectedType, products]);

  // reset extras when modal opens
  useEffect(() => {
    if (modalProduct) { setSelSauces([]); setSelViandes([]); setSelDesserts([]); }
  }, [modalProduct]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get(API_ENDPOINTS.PRODUCTS.BASE);
      setProducts(res.data || []);
    } catch { toast.error('Impossible de charger le menu'); }
    finally { setLoadingProducts(false); }
  };

  const loadExtras = async () => {
    try {
      const [s, d, v] = await Promise.allSettled([
        api.get(API_ENDPOINTS.SAUCES.AVAILABLE),
        api.get(API_ENDPOINTS.DESSERTS.AVAILABLE),
        api.get(API_ENDPOINTS.VIANDES.AVAILABLE),
      ]);
      setSauces(s.status  === 'fulfilled' && s.value.data?.length > 0 ? s.value.data : FALLBACK_SAUCES);
      setDesserts(d.status === 'fulfilled' && d.value.data?.length > 0 ? d.value.data : FALLBACK_DESSERTS);
      setViandes(v.status  === 'fulfilled' && v.value.data?.length > 0 ? v.value.data : FALLBACK_VIANDES);
    } catch {
      setSauces(FALLBACK_SAUCES); setDesserts(FALLBACK_DESSERTS); setViandes(FALLBACK_VIANDES);
    }
  };

  const loadFreeTables = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.TABLES.BASE);
      setFreeTables((res.data || []).filter(t => t.status === 'FREE'));
    } catch { setFreeTables([]); }
  };

  const filterProducts = () => {
    let list = products;
    if (menuSearch) list = list.filter(p => p.productName?.toLowerCase().includes(menuSearch.toLowerCase()));
    if (selectedType) list = list.filter(p => p.productType === selectedType);
    setFilteredProducts(list);
  };

  // ── dynamic customer search ───────────────────────────────────────────────
  const handleNameQuery = (val) => {
    setNameQuery(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(API_ENDPOINTS.CUSTOMERS.SEARCH(val));
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setNameQuery('');
    setSearchResults([]);
  };

  const handleQuickRegister = async () => {
    if (!newForm.firstName.trim() || !newForm.lastName.trim()) {
      toast.warning('Le prénom et le nom sont obligatoires');
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await api.post(API_ENDPOINTS.CUSTOMERS.QUICK_REGISTER, {
        firstName: newForm.firstName.trim(),
        lastName:  newForm.lastName.trim(),
        phone:     newForm.phone.trim() || null,
      });
      setSelectedCustomer(res.data);
      setShowNewForm(false);
      setNewForm({ firstName: '', lastName: '', phone: '' });
      toast.success(`Client "${res.data.firstName} ${res.data.lastName}" créé`);
    } catch { toast.error('Erreur lors de la création du client'); }
    finally { setSavingCustomer(false); }
  };

  // ── cart helpers ─────────────────────────────────────────────────────────
  const computeItemPrice = (product, sauceSel, viandeSel, dessertSel) => {
    const base = Number(product.unitPrice) || 0;
    return base
      + sauceSel.reduce((a, s) => a + Number(s.price), 0)
      + viandeSel.reduce((a, v) => a + Number(v.price), 0)
      + dessertSel.reduce((a, d) => a + Number(d.price), 0);
  };

  const addToCart = (product, sauceSel = [], viandeSel = [], dessertSel = []) => {
    if (product.quantityAvailable <= 0) { toast.error('Produit épuisé'); return; }
    const totalPrice  = computeItemPrice(product, sauceSel, viandeSel, dessertSel);
    const extrasLabel = [...sauceSel.map(s => s.name), ...viandeSel.map(v => v.name), ...dessertSel.map(d => d.name)].join(', ');
    const cartKey     = `${product.productId}_${extrasLabel}`;
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        if (existing.quantity >= product.quantityAvailable) {
          toast.warning('Limite de stock atteinte'); return prev;
        }
        toast.success(`${product.productName} +1`);
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${product.productName} ajouté`);
      return [...prev, {
        cartKey, productId: product.productId, productName: product.productName,
        unitPrice: totalPrice, basePrice: Number(product.unitPrice),
        extras: extrasLabel, quantity: 1,
      }];
    });
    setModalProduct(null);
  };

  const updateQty = (cartKey, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.cartKey !== cartKey));
    else setCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i));
  };

  const getTotal = () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const extrasModalTotal = () =>
    selSauces.reduce((a, s) => a + Number(s.price), 0) +
    selViandes.reduce((a, v) => a + Number(v.price), 0) +
    selDesserts.reduce((a, d) => a + Number(d.price), 0);

  const toggleExtra = (list, setList, item, idKey) =>
    setList(prev =>
      prev.some(i => i[idKey] === item[idKey]) ? prev.filter(i => i[idKey] !== item[idKey]) : [...prev, item]
    );

  // ── order submission ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.warning('Veuillez sélectionner un client'); return; }
    if (cart.length === 0)  { toast.warning('Le panier est vide'); return; }
    if (!tableId)           { toast.warning('Veuillez sélectionner une table'); return; }

    setSubmitting(true);
    try {
      const payload = {
        customerId:    selectedCustomer.customerId,
        tableId:       Number(tableId),
        orderType:     'ON_SITE',
        paymentMethod: payMethod,
        pickupTime:    null,
        guestCount:    parseInt(guestCount, 10) || 1,
        createdBy:     user.username,
        orderItems:    cart.map(i => ({
          productId: Number(i.productId),
          quantity:  Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };
      await api.post(API_ENDPOINTS.ORDERS.BASE, payload);
      toast.success('Commande passée avec succès !');
      navigate('/waiter/orders');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur lors de la soumission de la commande');
    } finally { setSubmitting(false); }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  const foodProducts  = filteredProducts.filter(p => p.productType === PRODUCT_TYPE.FOOD);
  const drinkProducts = filteredProducts.filter(p => p.productType === PRODUCT_TYPE.DRINK);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-black text-gray-900">Nouvelle commande</h1>
          <p className="text-sm text-gray-500 mt-1">Commande au nom du client — sur place</p>
        </div>

        {/* ══════════════ ÉTAPE 1 : CLIENT ══════════════ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" /> Client
          </h2>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div>
                <p className="font-bold text-blue-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-blue-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {selectedCustomer.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={nameQuery}
                  onChange={e => handleNameQuery(e.target.value)}
                  placeholder="Rechercher un client par prénom ou nom…"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Recherche…</span>
                )}
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <ul className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {searchResults.map(c => (
                    <li key={c.customerId}>
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{c.firstName} {c.lastName}</p>
                          {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {nameQuery.length > 1 && !searching && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">Aucun client trouvé</p>
              )}

              {/* New client form */}
              {!showNewForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-1"
                >
                  <UserPlus className="h-4 w-4" /> Client sans compte — saisir ses informations
                </button>
              ) : (
                <div className="border border-dashed border-blue-300 rounded-xl p-4 space-y-3 bg-blue-50">
                  <p className="text-sm font-bold text-blue-800 mb-1">Nouveau client</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={newForm.firstName}
                      onChange={e => setNewForm(p => ({ ...p, firstName: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Nom *"
                      value={newForm.lastName}
                      onChange={e => setNewForm(p => ({ ...p, lastName: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder="Téléphone (optionnel)"
                    value={newForm.phone}
                    onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleQuickRegister}
                      disabled={savingCustomer}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-60"
                    >
                      {savingCustomer ? 'Enregistrement…' : 'Enregistrer le client'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewForm(false); setNewForm({ firstName: '', lastName: '', phone: '' }); }}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ══════════════ ÉTAPE 2 : MENU ══════════════ */}
        {selectedCustomer && (
          <section className="space-y-4">
            {/* Menu search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  placeholder="Rechercher dans le menu…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {[{ label: 'Tout', val: '' }, { label: 'Plats', val: PRODUCT_TYPE.FOOD }, { label: 'Boissons', val: PRODUCT_TYPE.DRINK }].map(tab => (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => setSelectedType(tab.val)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                      ${selectedType === tab.val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingProducts ? (
              <p className="text-center text-gray-400 py-10">Chargement du menu…</p>
            ) : (
              <div className="space-y-6">
                {/* Food */}
                {(!selectedType || selectedType === PRODUCT_TYPE.FOOD) && foodProducts.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                      <Utensils className="h-4 w-4 text-orange-500" /> Plats
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {foodProducts.map(p => (
                        <ProductTile key={p.productId} product={p} onSelect={() => setModalProduct(p)} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Drinks */}
                {(!selectedType || selectedType === PRODUCT_TYPE.DRINK) && drinkProducts.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                      <Droplets className="h-4 w-4 text-blue-500" /> Boissons
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {drinkProducts.map(p => (
                        <ProductTile key={p.productId} product={p} onSelect={() => setModalProduct(p)} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-gray-400 py-10">Aucun produit trouvé</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ══════════════ ÉTAPE 3 : PANIER + SOUMISSION ══════════════ */}
        {selectedCustomer && cart.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" /> Panier
            </h2>

            {/* Cart items */}
            <ul className="divide-y divide-gray-100">
              {cart.map(item => (
                <li key={item.cartKey} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.productName}</p>
                    {item.extras && (
                      <p className="text-xs text-gray-500 truncate">{item.extras}</p>
                    )}
                    <p className="text-sm font-bold text-blue-600">{(item.unitPrice * item.quantity).toFixed(2)} €</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQty(item.cartKey, 0)}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total */}
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="font-bold text-gray-700">Total</span>
              <span className="text-xl font-black text-blue-700">{getTotal().toFixed(2)} €</span>
            </div>

            {/* Table + guest count + payment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">Table *</label>
                <select
                  value={tableId}
                  onChange={e => setTableId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choisir une table</option>
                  {freeTables.map(t => (
                    <option key={t.tableId} value={t.tableId}>Table {t.tableNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">Couverts</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={guestCount}
                  onChange={e => setGuestCount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">Paiement</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Espèces</option>
                  <option value="CARD">Carte bancaire</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-base shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-60 disabled:shadow-none"
            >
              {submitting ? 'Soumission…' : `Commander pour ${selectedCustomer.firstName} — ${getTotal().toFixed(2)} €`}
            </button>
          </section>
        )}
      </div>

      {/* ══════════════ MODAL EXTRAS ══════════════ */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
              <div>
                <h3 className="font-black text-lg text-gray-900">{modalProduct.productName}</h3>
                <p className="text-sm text-gray-500">{Number(modalProduct.unitPrice).toFixed(2)} € de base</p>
              </div>
              <button
                type="button"
                onClick={() => setModalProduct(null)}
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Extras */}
            <div className="overflow-y-auto px-6 pb-4 space-y-5 flex-1">
              {/* Viandes */}
              {modalProduct.productType === PRODUCT_TYPE.FOOD && viandes.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    🥩 Viandes
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {viandes.map(v => (
                      <ExtraCheckbox
                        key={v.viandeId}
                        item={v}
                        idKey="viandeId"
                        selected={selViandes}
                        onToggle={item => toggleExtra(selViandes, setSelViandes, item, 'viandeId')}
                        color="red"
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Sauces */}
              {modalProduct.productType === PRODUCT_TYPE.FOOD && modalProduct.needsSauce && sauces.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    🫙 Sauces
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {sauces.map(s => (
                      <ExtraCheckbox
                        key={s.sauceId}
                        item={s}
                        idKey="sauceId"
                        selected={selSauces}
                        onToggle={item => toggleExtra(selSauces, setSelSauces, item, 'sauceId')}
                        color="orange"
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Desserts */}
              {desserts.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    🍰 Desserts
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {desserts.map(d => (
                      <ExtraCheckbox
                        key={d.dessertId}
                        item={d}
                        idKey="dessertId"
                        selected={selDesserts}
                        onToggle={item => toggleExtra(selDesserts, setSelDesserts, item, 'dessertId')}
                        color="purple"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Price recap */}
              <div className="bg-blue-600 rounded-2xl p-4 text-white">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-200">Base</span>
                  <span className="font-semibold">{Number(modalProduct.unitPrice).toFixed(2)} €</span>
                </div>
                {extrasModalTotal() > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-200">Extras</span>
                    <span className="font-semibold">+{extrasModalTotal().toFixed(2)} €</span>
                  </div>
                )}
                <div className="border-t border-blue-500 mt-2 pt-2 flex justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-2xl">
                    {(Number(modalProduct.unitPrice) + extrasModalTotal()).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2 flex gap-4 flex-shrink-0 border-t border-gray-100">
              <button
                type="button"
                disabled={modalProduct.quantityAvailable <= 0}
                onClick={() => addToCart(modalProduct, selSauces, selViandes, selDesserts)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
              >
                <ShoppingCart className="h-5 w-5" />
                {modalProduct.quantityAvailable <= 0 ? 'Épuisé' : `Ajouter — ${(Number(modalProduct.unitPrice) + extrasModalTotal()).toFixed(2)} €`}
              </button>
              <button
                type="button"
                onClick={() => setModalProduct(null)}
                className="px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

// ─── ProductTile ───────────────────────────────────────────────────────────────
const ProductTile = ({ product, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={product.quantityAvailable <= 0}
    className={`bg-white rounded-2xl border overflow-hidden text-left transition-all active:scale-95
      ${product.quantityAvailable <= 0
        ? 'border-gray-100 opacity-50 cursor-not-allowed'
        : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'}`}
  >
    {product.imageUrl ? (
      <img
        src={product.imageUrl}
        alt={product.productName}
        className="w-full h-28 object-cover"
      />
    ) : (
      <div className="w-full h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <Utensils className="h-8 w-8 text-gray-300" />
      </div>
    )}
    <div className="p-3">
      <p className="font-bold text-sm text-gray-900 leading-tight line-clamp-2">{product.productName}</p>
      <p className="font-black text-blue-600 text-sm mt-1">{Number(product.unitPrice).toFixed(2)} €</p>
      {product.quantityAvailable <= 0 && (
        <p className="text-xs text-red-500 font-semibold mt-1">Épuisé</p>
      )}
    </div>
  </button>
);

export default WaiterNewOrderPage;
