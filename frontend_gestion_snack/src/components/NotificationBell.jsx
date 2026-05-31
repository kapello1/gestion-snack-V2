import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, Send, Megaphone, Users, Radio, Search, Loader2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

const TYPE_ICON = {
  order_status: '🍽️',
  reservation_status: '📅',
  admin_broadcast: '📢',
};

const formatAge = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return new Date(ts).toLocaleDateString('fr-FR');
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead, broadcastNotification, sendToUser } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.roleName === ROLES.ADMIN;

  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sendMode, setSendMode] = useState('all'); // 'all' | 'specific'
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [custSearch, setCustSearch] = useState('');
  const [loadingCusts, setLoadingCusts] = useState(false);
  const [sending, setSending] = useState(false);

  const panelRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoadingCusts(true);
    try {
      const res = await api.get(API_ENDPOINTS.CUSTOMERS.BASE);
      setCustomers(res.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCusts(false);
    }
  }, []);

  const openForm = () => {
    setShowForm(true);
    setSendMode('all');
    setMsgTitle('');
    setMsgBody('');
    setSelectedIds(new Set());
    setCustSearch('');
    fetchCustomers();
  };

  const closeForm = () => {
    setShowForm(false);
    setMsgTitle('');
    setMsgBody('');
    setSelectedIds(new Set());
    setCustSearch('');
  };

  const toggleCustomer = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!msgBody.trim()) return;
    setSending(true);
    const title = msgTitle.trim() || 'Message de l\'administration';
    const message = msgBody.trim();

    if (sendMode === 'all') {
      broadcastNotification(message, title);
    } else {
      selectedIds.forEach(id => {
        sendToUser(id, { title, message });
      });
    }

    setSending(false);
    closeForm();
  };

  const filteredCustomers = customers.filter(c => {
    const q = custSearch.toLowerCase();
    return (
      !q ||
      (c.fullName || c.username || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const canSend = msgBody.trim() && (sendMode === 'all' || selectedIds.size > 0);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen(o => !o); if (isOpen) setShowForm(false); }}
        className="relative p-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-1 items-center">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="h-4 w-4 text-blue-600" />
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); setShowForm(false); }}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Aucune notification</p>
                <p className="text-xs text-gray-400 mt-1">Vous êtes à jour !</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${!notif.read ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5 leading-none">{TYPE_ICON[notif.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 shadow-sm" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatAge(notif.timestamp)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Admin broadcast section */}
          {isAdmin && (
            <div className="border-t border-gray-200 bg-gray-50 p-3">
              {!showForm ? (
                <button
                  onClick={openForm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-xl transition-colors border border-dashed border-blue-300"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  Envoyer une notification
                </button>
              ) : (
                <div className="space-y-2.5">
                  {/* Title */}
                  <input
                    type="text"
                    value={msgTitle}
                    onChange={e => setMsgTitle(e.target.value)}
                    placeholder="Titre (optionnel)"
                    className="w-full text-sm text-gray-900 placeholder-gray-400 px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  />

                  {/* Message */}
                  <textarea
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    placeholder="Votre message..."
                    rows={2}
                    autoFocus
                    className="w-full text-sm text-gray-900 placeholder-gray-400 px-3 py-2 bg-white border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  />

                  {/* Recipient toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-gray-300 bg-white">
                    <button
                      onClick={() => setSendMode('all')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${sendMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Tous les clients
                    </button>
                    <button
                      onClick={() => setSendMode('specific')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors border-l border-gray-300 ${sendMode === 'specific' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Sélection
                    </button>
                  </div>

                  {/* Customer selection */}
                  {sendMode === 'specific' && (
                    <div className="border border-gray-300 rounded-xl bg-white overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
                        <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={custSearch}
                          onChange={e => setCustSearch(e.target.value)}
                          placeholder="Rechercher un client..."
                          className="flex-1 text-xs text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {loadingCusts ? (
                          <div className="flex items-center justify-center py-4 gap-2">
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            <span className="text-xs text-gray-500">Chargement...</span>
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Aucun client trouvé</p>
                        ) : (
                          filteredCustomers.map(c => {
                            const id = c.customerId || c.userId;
                            const name = c.fullName || c.username || `Client #${id}`;
                            const sub = c.email || '';
                            const checked = selectedIds.has(id);
                            return (
                              <label
                                key={id}
                                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCustomer(id)}
                                  className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                                  {sub && <p className="text-[10px] text-gray-500 truncate">{sub}</p>}
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {selectedIds.size > 0 && (
                        <div className="px-3 py-1.5 border-t border-gray-200 bg-blue-50">
                          <p className="text-[10px] font-semibold text-blue-700">
                            {selectedIds.size} client{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={closeForm}
                      className="flex-1 py-2 text-xs text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!canSend || sending}
                      className="flex-1 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
