import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import {
  Search, Calendar, Plus, X, ChevronLeft, Users, Clock, CheckCircle, AlertCircle
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

// ── Wizard de création ─────────────────────────────────────────────────────────

const ReservationWizard = ({ onClose, onCreated, customerId, username }) => {
  const [step, setStep]               = useState(1);
  const [date, setDate]               = useState('');
  const [guests, setGuests]           = useState(2);
  const [slots, setSlots]             = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming]   = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Étape 1 → 2 : charger les disponibilités
  const handleFetchSlots = async (e) => {
    e.preventDefault();
    setLoadingSlots(true);
    try {
      const res = await api.get(API_ENDPOINTS.RESERVATIONS.AVAILABILITY, {
        params: { date, guests },
      });
      setSlots(res.data || []);
      setStep(2);
    } catch {
      toast.error('Erreur lors du chargement des disponibilités');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Étape 2 → 3 : sélectionner un créneau
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  // Étape 3 : confirmer la réservation
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
    } finally {
      setConfirming(false);
    }
  };

  // ── Rendu du wizard ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-white">Nouvelle réservation</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex border-b border-gray-100">
          {['Date & personnes', 'Créneau', 'Confirmation'].map((label, i) => (
            <div key={i} className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${
              step === i + 1
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : step > i + 1
                ? 'text-emerald-600'
                : 'text-gray-400'
            }`}>
              {step > i + 1 ? '✓ ' : `${i + 1}. `}{label}
            </div>
          ))}
        </div>

        <div className="p-6">

          {/* ── Étape 1 : date + personnes ──────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleFetchSlots} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="inline h-4 w-4 mr-1 text-blue-500" />
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Users className="inline h-4 w-4 mr-1 text-blue-500" />
                  Nombre de personnes *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 font-bold text-lg transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-gray-800 w-8 text-center">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests(g => g + 1)}
                    className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 font-bold text-lg transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 ml-1">personne{guests > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Service midi 11h–14h · Service soir 18h–22h · Durée : 1h30
              </div>

              <button
                type="submit"
                disabled={!date || loadingSlots}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
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
                <Calendar className="inline h-4 w-4 mr-1 text-blue-500" />
                {fmtDayLong(date)} · {guests} personne{guests > 1 ? 's' : ''}
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-10">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">Aucune disponibilité</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Aucune table disponible pour {guests} personne{guests > 1 ? 's' : ''} ce jour.<br />
                    Essayez une autre date ou réduisez le nombre de personnes.
                  </p>
                  <button
                    onClick={() => setStep(1)}
                    className="mt-4 text-sm text-blue-600 hover:underline font-medium"
                  >
                    ← Modifier la date
                  </button>
                </div>
              ) : (
                <>
                  {/* Midi */}
                  {slots.some(s => parseInt(s.time) < 15) && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        ☀️ Service midi
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.filter(s => parseInt(s.time) < 15).map(slot => (
                          <SlotButton key={slot.time} slot={slot} onClick={handleSelectSlot} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Soir */}
                  {slots.some(s => parseInt(s.time) >= 15) && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        🌙 Service soir
                      </p>
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

          {/* ── Étape 3 : récapitulatif + confirmation ───────────────────── */}
          {step === 3 && selectedSlot && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Récapitulatif de votre réservation
                </p>
                <div className="divide-y divide-emerald-100">
                  <div className="py-2 flex justify-between text-sm">
                    <span className="text-gray-600">Date</span>
                    <span className="font-semibold text-gray-800">{fmtDayLong(date)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-sm">
                    <span className="text-gray-600">Heure</span>
                    <span className="font-semibold text-gray-800">{selectedSlot.time}</span>
                  </div>
                  <div className="py-2 flex justify-between text-sm">
                    <span className="text-gray-600">Durée</span>
                    <span className="font-semibold text-gray-800">1h30</span>
                  </div>
                  <div className="py-2 flex justify-between text-sm">
                    <span className="text-gray-600">Personnes</span>
                    <span className="font-semibold text-gray-800">
                      {guests} personne{guests > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Une table adaptée sera automatiquement assignée.<br />
                Un email de confirmation vous sera envoyé.
              </p>

              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {confirming
                  ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Réservation en cours...</>
                  : <><CheckCircle className="h-4 w-4" /> Confirmer la réservation</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Bouton de créneau
const SlotButton = ({ slot, onClick }) => (
  <button
    onClick={() => onClick(slot)}
    className="flex flex-col items-center py-3 px-2 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 group"
  >
    <span className="text-sm font-bold text-gray-800 group-hover:text-blue-700">
      {slot.time}
    </span>
    <span className="text-[10px] text-gray-400 group-hover:text-blue-500 mt-0.5">
      {slot.availableTables} table{slot.availableTables > 1 ? 's' : ''}
    </span>
  </button>
);

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
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                      className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors text-sm font-semibold"
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
