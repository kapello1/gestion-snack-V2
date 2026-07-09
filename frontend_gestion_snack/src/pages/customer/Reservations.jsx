import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, Calendar, Plus, X, ChevronLeft, Users, Clock, CheckCircle, AlertCircle,
  UtensilsCrossed, Armchair
} from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, RESERVATION_STATUS, STATUS_COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { wsManager } from '../../lib/wsManager';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }) : '-';

const fmtDayLong = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

// ── Wizard de création (4 étapes) ─────────────────────────────────────────────
// Étape 1 : date + nb personnes
// Étape 2 : choix du créneau
// Étape 3 : visualisation & choix de la table
// Étape 4 : confirmation

const STEP_LABELS = ['Date & personnes', 'Créneau', 'Votre table', 'Confirmation'];

const ReservationWizard = ({ onClose, onCreated, customerId, username }) => {
  const [step, setStep]               = useState(1);
  const [date, setDate]               = useState('');
  const [guests, setGuests]           = useState(2);
  const [slots, setSlots]             = useState([]);
  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [availTables, setAvailTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loadingSlots, setLoadingSlots]   = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [confirming, setConfirming]   = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Étape 1 → 2 : charger créneaux
  const handleFetchSlots = async (e) => {
    e.preventDefault();
    setLoadingSlots(true);
    try {
      const res = await api.get(API_ENDPOINTS.RESERVATIONS.AVAILABILITY, { params: { date, guests } });
      const allSlots = res.data || [];
      const nowBE  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Brussels' }));
      const todayBE = new Date(nowBE.getFullYear(), nowBE.getMonth(), nowBE.getDate());
      const chosen  = date ? new Date(date + 'T00:00:00') : null;
      const isToday = chosen && chosen.getTime() === todayBE.getTime();
      const filtered = isToday
        ? allSlots.filter(s => {
            const [h, m] = String(s.time).split(':').map(Number);
            return (h * 60 + m) >= (nowBE.getHours() * 60 + nowBE.getMinutes() + 30);
          })
        : allSlots;
      setSlots(filtered);
      setStep(2);
    } catch { toast.error('Erreur lors du chargement des disponibilités'); }
    finally { setLoadingSlots(false); }
  };

  // Étape 2 → 3 : charger les tables disponibles pour le créneau choisi
  const handleSelectSlot = async (slot) => {
    setSelectedSlot(slot);
    setSelectedTable(null);
    setLoadingTables(true);
    setStep(3);
    try {
      const res = await api.get(API_ENDPOINTS.RESERVATIONS.AVAILABLE_TABLES, {
        params: { date, time: slot.time, guests },
      });
      setAvailTables(res.data || []);
    } catch { toast.error('Erreur lors du chargement des tables'); }
    finally { setLoadingTables(false); }
  };

  // Étape 3 → 4
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setStep(4);
  };

  // Étape 4 : confirmer
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post(API_ENDPOINTS.RESERVATIONS.BASE, {
        customerId,
        guests,
        date,
        time: selectedSlot.time,
        createdBy: username,
      });
      toast.success('Réservation créée ! Un email de confirmation vous a été envoyé.');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la réservation');
    } finally { setConfirming(false); }
  };

  const goBack = () => setStep(s => Math.max(1, s - 1));

  // ── Rendu du wizard ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={goBack} className="text-white/80 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" /> Nouvelle réservation
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`flex-1 min-w-0 py-2.5 text-center text-[11px] font-semibold whitespace-nowrap px-1 transition-colors ${
              step === i + 1
                ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50'
                : step > i + 1 ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              {step > i + 1 ? '✓ ' : `${i + 1}. `}{label}
            </div>
          ))}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">

          {/* ── Étape 1 : date + personnes ──────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleFetchSlots} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="inline h-4 w-4 mr-1 text-violet-500" /> Date *
                </label>
                <input type="date" value={date} min={today}
                  onChange={e => setDate(e.target.value)} required
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Users className="inline h-4 w-4 mr-1 text-violet-500" /> Nombre de personnes *
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-600 hover:border-violet-500 hover:text-violet-600 font-bold text-lg transition-colors flex items-center justify-center">−</button>
                  <span className="text-2xl font-bold text-gray-800 w-8 text-center">{guests}</span>
                  <button type="button" onClick={() => setGuests(g => g + 1)}
                    className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-600 hover:border-violet-500 hover:text-violet-600 font-bold text-lg transition-colors flex items-center justify-center">+</button>
                  <span className="text-sm text-gray-500 ml-1">personne{guests > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="rounded-xl p-3 text-xs text-violet-700" style={{ backgroundColor: 'rgba(139,92,246,0.08)' }}>
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Service midi 11h–14h · Service soir 18h–22h · Durée : 1h30
              </div>
              <button type="submit" disabled={!date || loadingSlots}
                className="w-full py-3 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {loadingSlots
                  ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Chargement...</>
                  : 'Voir les disponibilités →'}
              </button>
            </form>
          )}

          {/* ── Étape 2 : grille de créneaux ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 font-medium">
                <Calendar className="inline h-4 w-4 mr-1 text-violet-500" />
                {fmtDayLong(date)} · {guests} personne{guests > 1 ? 's' : ''}
              </div>
              {slots.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">Aucune disponibilité</p>
                  <p className="text-sm text-gray-500 mt-1">Essayez une autre date ou réduisez le nombre de personnes.</p>
                  <button onClick={() => setStep(1)} className="mt-4 text-sm text-violet-600 hover:underline font-medium">← Modifier la date</button>
                </div>
              ) : (
                <>
                  {slots.some(s => parseInt(s.time) < 15) && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">☀️ Service midi</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.filter(s => parseInt(s.time) < 15).map(slot => (
                          <SlotButton key={slot.time} slot={slot} onClick={handleSelectSlot} />
                        ))}
                      </div>
                    </div>
                  )}
                  {slots.some(s => parseInt(s.time) >= 15) && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🌙 Service soir</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.filter(s => parseInt(s.time) >= 15).map(slot => (
                          <SlotButton key={slot.time} slot={slot} onClick={handleSelectSlot} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Étape 3 : visualisation des tables disponibles ──────────── */}
          {step === 3 && selectedSlot && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-500" />
                {fmtDayLong(date)} à {selectedSlot.time} · {guests} personne{guests > 1 ? 's' : ''}
              </div>

              {loadingTables ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="h-8 w-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Chargement des tables...</p>
                </div>
              ) : availTables.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">Aucune table disponible</p>
                  <p className="text-sm text-gray-500 mt-1">Ce créneau est complet. Choisissez un autre horaire.</p>
                  <button onClick={() => setStep(2)} className="mt-4 text-sm text-violet-600 hover:underline font-medium">← Choisir un autre créneau</button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    {availTables.length} table{availTables.length > 1 ? 's' : ''} disponible{availTables.length > 1 ? 's' : ''} - cliquez pour choisir la vôtre
                  </p>

                  {/* Plan de salle visuel */}
                  <div className="relative rounded-2xl p-4 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #f8f7ff, #f0effe)', border: '1px solid rgba(139,92,246,0.2)' }}>

                    {/* Légende */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-violet-400 block" /> Votre groupe
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gray-200 block" /> Places libres
                      </span>
                    </div>

                    {/* Grille des tables */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availTables.map(table => (
                        <TableCard
                          key={table.tableId}
                          table={table}
                          guests={guests}
                          selected={selectedTable?.tableId === table.tableId}
                          onClick={() => handleSelectTable(table)}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Seules les tables avec au moins {guests} place{guests > 1 ? 's' : ''} sont affichées.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Étape 4 : confirmation ───────────────────────────────────── */}
          {step === 4 && selectedSlot && selectedTable && (
            <div className="space-y-5">
              {/* Carte table sélectionnée */}
              <div className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.06))', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white font-black text-xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  #{selectedTable.tableNumber}
                </div>
                <div>
                  <p className="font-bold text-gray-800">Table {selectedTable.tableNumber}</p>
                  <p className="text-sm text-gray-500">{selectedTable.capacity} places · {fmtDayLong(date)}</p>
                  <p className="text-sm font-semibold text-violet-600">{selectedSlot.time} - durée 1h30</p>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-0.5 divide-y divide-emerald-100">
                {[
                  ['Date',      fmtDayLong(date)],
                  ['Heure',     selectedSlot.time],
                  ['Durée',     '1h30'],
                  ['Personnes', `${guests} personne${guests > 1 ? 's' : ''}`],
                  ['Table',     `#${selectedTable.tableNumber} (${selectedTable.capacity} places)`],
                ].map(([k, v]) => (
                  <div key={k} className="py-2 flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold text-gray-800">{v}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Un email de confirmation vous sera envoyé automatiquement.
              </p>

              <button onClick={handleConfirm} disabled={confirming}
                className="w-full py-3 text-white font-bold rounded-xl disabled:opacity-50 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {confirming
                  ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Réservation en cours...</>
                  : <><CheckCircle className="h-4 w-4" /> Confirmer ma réservation</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ── Bouton de créneau ──────────────────────────────────────────────────────────
const SlotButton = ({ slot, onClick }) => (
  <button onClick={() => onClick(slot)}
    className="flex flex-col items-center py-3.5 px-2 min-h-[56px] rounded-xl border-2 border-gray-200 hover:border-violet-500 hover:bg-violet-50 transition-all duration-150 group touch-manipulation">
    <span className="text-sm font-bold text-gray-800 group-hover:text-violet-700">{slot.time}</span>
    <span className="text-[10px] text-gray-400 group-hover:text-violet-500 mt-0.5">
      {slot.availableTables} table{slot.availableTables > 1 ? 's' : ''}
    </span>
  </button>
);

// ── Carte de table visuelle ────────────────────────────────────────────────────
const TableCard = ({ table, guests, selected, onClick }) => {
  const chairsToShow = Math.min(table.capacity, 8);
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 touch-manipulation group ${
        selected
          ? 'border-violet-500 shadow-lg scale-[1.03]'
          : 'border-transparent hover:border-violet-300 hover:shadow-md'
      }`}
      style={selected
        ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))' }
        : { backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

      {selected && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
          <CheckCircle className="h-3 w-3 text-white" />
        </span>
      )}

      {/* Visuel table avec chaises */}
      <div className="relative w-16 h-16">
        {/* Chaises du haut */}
        <div className="absolute top-0 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: Math.ceil(chairsToShow / 2) }).map((_, i) => (
            <div key={`t${i}`} className={`w-3.5 h-3 rounded-t-lg ${i < Math.ceil(guests / 2) ? 'bg-violet-400' : 'bg-gray-200'}`} />
          ))}
        </div>
        {/* Plateau */}
        <div className={`absolute top-3.5 left-1 right-1 bottom-3.5 rounded-lg flex items-center justify-center font-black text-xl ${
          selected ? 'bg-violet-600 text-white' : 'bg-gray-700 text-white'
        }`}>
          {table.tableNumber}
        </div>
        {/* Chaises du bas */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: Math.floor(chairsToShow / 2) }).map((_, i) => (
            <div key={`b${i}`} className={`w-3.5 h-3 rounded-b-lg ${
              i < Math.floor(guests / 2) ? 'bg-violet-400' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-gray-700">Table {table.tableNumber}</p>
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-0.5">
          <Armchair className="h-2.5 w-2.5" /> {table.capacity} places
        </p>
      </div>
    </button>
  );
};

// ── Page principale ────────────────────────────────────────────────────────────

const ReservationsPage = () => {
  const { user } = useAuth();
  const [reservations, setReservations]           = useState([]);
  const [filteredReservations, setFiltered]        = useState([]);
  const [loading, setLoading]                      = useState(true);
  const [searchTerm, setSearchTerm]                = useState('');
  const [activeTab, setActiveTab]                  = useState('active');
  const [showWizard, setShowWizard]                = useState(false);

  useEffect(() => { loadReservations(true); }, [user]);
  useEffect(() => { filterReservations(); }, [searchTerm, reservations, activeTab]);
  useEffect(() => wsManager.onEvent(() => loadReservations(false)), []);

  const loadReservations = async (showLoad = false) => {
    if (!user?.ownerId) return;
    try {
      if (showLoad) setLoading(true);
      const res = await api.get(API_ENDPOINTS.RESERVATIONS.BY_CUSTOMER(user.ownerId));
      setReservations(res.data || []);
    } catch {
      if (showLoad) toast.error('Erreur lors du chargement des réservations');
    } finally {
      if (showLoad) setLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = reservations;
    if (activeTab === 'active') {
      filtered = filtered.filter(r => r.status === RESERVATION_STATUS.BOOKED);
    } else {
      filtered = filtered.filter(
        r => r.status === RESERVATION_STATUS.CANCELLED || r.status === RESERVATION_STATUS.COMPLETED,
      );
    }
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.reservationId?.toString().includes(searchTerm) ||
        String(r.datetimeFrom || '').includes(searchTerm),
      );
    }
    setFiltered(filtered);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Annuler cette réservation ?')) return;
    try {
      await api.post(API_ENDPOINTS.RESERVATIONS.CANCEL(id));
      toast.success('Réservation annulée');
      loadReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    }
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
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* En-tête */}
        <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes réservations</h1>
            <p className="text-gray-500 mt-1">Gérez vos tables au restaurant</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold touch-manipulation"
          >
            <Plus className="h-5 w-5" />
            Nouvelle réservation
          </button>
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n° de réservation ou date…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 text-base border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5">
          <div className="flex border-b border-gray-100">
            {[['active', 'En cours'], ['history', 'Historique']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === val
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReservations.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucune réservation trouvée</p>
              {activeTab === 'active' && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="mt-4 text-sm text-blue-600 hover:underline font-medium"
                >
                  Réserver une table →
                </button>
              )}
            </div>
          ) : (
            filteredReservations.map(r => (
              <div
                key={r.reservationId}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Réservation #{r.reservationId}</p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">
                      Table #{r.tableNumber ?? r.tableId}
                      {r.tableCapacity && (
                        <span className="text-gray-400 font-normal"> · {r.tableCapacity} places</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    STATUS_COLORS.RESERVATION?.[r.status] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {LABELS.RESERVATION_STATUS?.[r.status] || r.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-800">{fmtDate(r.datetimeFrom)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Heure</span>
                    <span className="font-medium text-gray-800">{fmtTime(r.datetimeFrom)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Personnes</span>
                    <span className="font-medium text-gray-800">{r.places ?? '-'}</span>
                  </div>
                </div>

                {r.status === RESERVATION_STATUS.BOOKED && (
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleCancel(r.reservationId)}
                      className="w-full flex justify-center items-center gap-2 px-4 py-3 min-h-[44px] bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors text-sm font-semibold touch-manipulation"
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showWizard && (
        <ReservationWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => loadReservations(false)}
          customerId={user.ownerId}
          username={user.username}
        />
      )}
    </Layout>
  );
};

export default ReservationsPage;
