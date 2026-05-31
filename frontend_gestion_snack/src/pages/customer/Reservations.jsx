// Page des réservations du client
import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Calendar, Plus, X, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { LABELS, RESERVATION_STATUS, STATUS_COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import usePolling from '../../utils/usePolling';

const ReservationsPage = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [showModal, setShowModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [formData, setFormData] = useState({
    tableId: '',
    reservationDate: '',
    reservationTime: '',
    numberOfPeople: '',
  });

  useEffect(() => {
    loadReservations(true);
    loadTables();
  }, [user]);

  useEffect(() => {
    filterReservations();
  }, [searchTerm, reservations, activeTab]);

  usePolling(() => loadReservations(false), 5000);

  const loadReservations = async (showLoading = false) => {
    if (!user?.ownerId) return;

    try {
      if (showLoading) setLoading(true);
      const response = await api.get(API_ENDPOINTS.RESERVATIONS.BY_CUSTOMER(user.ownerId));
      setReservations(response.data || []);
    } catch (error) {
      if (showLoading) toast.error('Erreur lors du chargement des réservations');
      else throw error;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.TABLES.BASE);
      setTables(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des tables:', error);
    }
  };

  const filterReservations = () => {
    let filtered = reservations;

    // Filter by tab (active or history)
    if (activeTab === 'active') {
      filtered = filtered.filter(r => r.status === RESERVATION_STATUS.BOOKED);
    } else {
      filtered = filtered.filter(r => r.status === RESERVATION_STATUS.CANCELLED || r.status === RESERVATION_STATUS.COMPLETED);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (reservation) =>
          reservation.reservationId?.toString().includes(searchTerm) ||
          reservation.reservationDate?.toString().includes(searchTerm)
      );
    }

    setFilteredReservations(filtered);
  };

  const handleAdd = () => {
    setFormData({
      tableId: '',
      reservationDate: '',
      reservationTime: '',
      numberOfPeople: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const fromDate = new Date(`${formData.reservationDate}T${formData.reservationTime}`);
      const toDate = new Date(fromDate.getTime() + 2 * 60 * 60 * 1000);
      const pad = (num) => String(num).padStart(2, '0');
      const datetimeFrom = `${formData.reservationDate}T${formData.reservationTime}:00`;
      const datetimeTo = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}T${pad(toDate.getHours())}:${pad(toDate.getMinutes())}:00`;

      const payload = {
        customerId: user.ownerId,
        tableId: parseInt(formData.tableId),
        datetimeFrom: datetimeFrom,
        datetimeTo: datetimeTo,
        places: parseInt(formData.numberOfPeople),
        createdBy: user.username,
      };

      await api.post(API_ENDPOINTS.RESERVATIONS.BASE, payload);
      toast.success('Réservation créée avec succès');
      setShowModal(false);
      loadReservations();
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la création';
      toast.error(message);
    }
  };

  const handleCancel = async (reservationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      return;
    }

    try {
      await api.post(API_ENDPOINTS.RESERVATIONS.CANCEL(reservationId));
      toast.success('Réservation annulée avec succès');
      loadReservations();
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'annulation';
      toast.error(message);
    }
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

  const availableTables = tables.filter((table) => table.status === 'FREE');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes réservations</h1>
            <p className="text-gray-600 mt-2">Gérer toutes vos réservations de tables</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle réservation</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher une réservation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'active'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              En cours
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Historique
            </button>
          </div>
        </div>

        {/* Liste des réservations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReservations.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              Aucune réservation trouvée
            </div>
          ) : (
            filteredReservations.map((reservation) => (
              <div
                key={reservation.reservationId}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Réservation #{reservation.reservationId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Table #{reservation.tableId}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS.RESERVATION[reservation.status] ||
                      'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {LABELS.RESERVATION_STATUS[reservation.status] || reservation.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {reservation.datetimeFrom
                        ? new Date(reservation.datetimeFrom).toLocaleDateString('fr-FR')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Heure:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {reservation.datetimeFrom
                        ? new Date(reservation.datetimeFrom).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Nombre de personnes:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {reservation.places ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {reservation.status === RESERVATION_STATUS.BOOKED && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleCancel(reservation.reservationId)}
                      className="w-full flex justify-center items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Annuler</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal de création */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Nouvelle réservation
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table *
                  </label>
                  <select
                    value={formData.tableId}
                    onChange={(e) =>
                      setFormData({ ...formData, tableId: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Sélectionner une table</option>
                    {availableTables.map((table) => (
                      <option key={table.tableId} value={table.tableId}>
                        Table #{table.tableNumber} - Capacité: {table.capacity} personnes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.reservationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure *
                  </label>
                  <input
                    type="time"
                    value={formData.reservationTime}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationTime: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de personnes *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.numberOfPeople}
                    onChange={(e) =>
                      setFormData({ ...formData, numberOfPeople: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Réserver
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
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

export default ReservationsPage;

