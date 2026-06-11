import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { wsManager } from '../lib/wsManager';

const NotificationContext = createContext(null);

// ── Persistance locale des broadcasts lus / masqués (par userId) ─────────────
const BROADCAST_READ_KEY   = 'snack_broadcast_reads_';
const BROADCAST_HIDDEN_KEY = 'snack_broadcast_hidden_';

const loadBroadcastReads  = (uid) => { try { return JSON.parse(localStorage.getItem(BROADCAST_READ_KEY   + uid) || '[]'); } catch { return []; } };
const saveBroadcastReads  = (uid, ids) => { try { localStorage.setItem(BROADCAST_READ_KEY   + uid, JSON.stringify(ids)); } catch {} };
const loadBroadcastHidden = (uid) => { try { return JSON.parse(localStorage.getItem(BROADCAST_HIDDEN_KEY + uid) || '[]'); } catch { return []; } };
const saveBroadcastHidden = (uid, ids) => { try { localStorage.setItem(BROADCAST_HIDDEN_KEY + uid, JSON.stringify(ids)); } catch {} };

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notifToast, setNotifToast] = useState(null);
  const lastStatusRef = useRef({});
  const loadedRef = useRef(false);
  const notifTimerRef = useRef(null);

  const userId = user?.userId || null;

  // ── Chargement initial depuis la BD ──────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      loadedRef.current = false;
      return;
    }
    loadedRef.current = false;
    loadFromDB(userId);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFromDB = async (uid) => {
    try {
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.FOR_USER(uid));
      const data = res.data || [];
      const readBroadcasts   = loadBroadcastReads(uid);
      const hiddenBroadcasts = loadBroadcastHidden(uid);

      const normalized = data
        // Exclure les broadcasts masqués (supprimés localement par l'utilisateur)
        .filter(n => !(n.isBroadcast && hiddenBroadcasts.includes(n.idMessage)))
        .map(n => ({
          id: n.idMessage,
          title: n.title || 'Notification',
          message: n.content,
          type: n.notifType || 'admin_broadcast',
          timestamp: n.sentAt,
          isBroadcast: n.isBroadcast || false,
          read: n.isBroadcast
            ? readBroadcasts.includes(n.idMessage)
            : (n.isRead || false),
        }));

      normalized.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(normalized);
      loadedRef.current = true;
    } catch (e) {
      console.error('[Notifications] Erreur chargement BD:', e);
    }
  };

  // ── Écoute WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    return wsManager.onNotification((data) => {
      const newNotif = {
        id: data.idMessage || (Date.now() + Math.random()),
        title: data.title || 'Notification',
        message: data.message || data.content || '',
        type: data.type || 'admin_broadcast',
        timestamp: data.timestamp || new Date().toISOString(),
        isBroadcast: data.isBroadcast || false,
        read: false,
      };
      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        clearTimeout(notifTimerRef.current);
        setNotifToast({
          title: newNotif.title,
          message: newNotif.message,
          emoji: newNotif.isBroadcast ? '📢' : '🔔',
        });
        notifTimerRef.current = setTimeout(() => setNotifToast(null), 5000);
        return [newNotif, ...prev];
      });
    });
  }, [userId]);

  // ── Actions lecture ───────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId) => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    try { await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notifId)); } catch {}
    const reads = loadBroadcastReads(userId);
    if (!reads.includes(notifId)) saveBroadcastReads(userId, [...reads, notifId]);
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const broadcastIds = [];
    const personalIds  = [];
    setNotifications(prev => {
      prev.forEach(n => {
        if (!n.read) {
          if (n.isBroadcast) broadcastIds.push(n.id);
          else personalIds.push(n.id);
        }
      });
      return prev.map(n => ({ ...n, read: true }));
    });
    if (broadcastIds.length > 0) {
      const reads = loadBroadcastReads(userId);
      saveBroadcastReads(userId, [...new Set([...reads, ...broadcastIds])]);
    }
    await Promise.all(
      personalIds.map(id => api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)).catch(() => {}))
    );
  }, [userId]);

  // ── Suppression individuelle ──────────────────────────────────────────────
  const deleteNotification = useCallback(async (notifId, isBroadcast = false) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));

    if (isBroadcast) {
      // Broadcasts sont partagés → on les masque localement sans toucher la BD
      if (userId) {
        const hidden = loadBroadcastHidden(userId);
        if (!hidden.includes(notifId)) saveBroadcastHidden(userId, [...hidden, notifId]);
        // Retirer aussi des lus
        const reads = loadBroadcastReads(userId).filter(id => id !== notifId);
        saveBroadcastReads(userId, reads);
      }
      return;
    }

    // Message personnel → supprimer de la BD
    try {
      await api.delete(API_ENDPOINTS.MESSAGES.BY_ID(notifId));
    } catch {}
  }, [userId]);

  // ── Suppression de toutes les notifications ───────────────────────────────
  const deleteAllNotifications = useCallback(async () => {
    if (!userId) return;

    setNotifications(prev => {
      const broadcasts = prev.filter(n => n.isBroadcast);
      const personal   = prev.filter(n => !n.isBroadcast);

      // Masquer tous les broadcasts localement
      if (broadcasts.length > 0) {
        const existingHidden = loadBroadcastHidden(userId);
        saveBroadcastHidden(userId, [...new Set([...existingHidden, ...broadcasts.map(n => n.id)])]);
        saveBroadcastReads(userId, []);
      }

      // Supprimer les messages personnels de la BD (en parallèle, silencieux)
      Promise.allSettled(
        personal.map(n => api.delete(API_ENDPOINTS.MESSAGES.BY_ID(n.id)))
      );

      return [];
    });
  }, [userId]);

  // ── Envoi de notifications ────────────────────────────────────────────────
  const sendToUser = useCallback(async (targetOwnerId, notif) => {
    if (!targetOwnerId) return;
    try {
      await api.post(API_ENDPOINTS.NOTIFICATIONS.PERSONAL(targetOwnerId), {
        title: notif.title || 'Notification',
        content: notif.message,
        notifType: notif.type || 'order_status',
      });
    } catch (e) {
      console.error('[Notifications] Erreur sendToUser:', e);
    }
  }, []);

  const broadcastNotification = useCallback(async (message, title = "Message de l'administration") => {
    try {
      await api.post(API_ENDPOINTS.NOTIFICATIONS.BROADCAST, { title, content: message });
    } catch (e) {
      console.error('[Notifications] Erreur broadcast:', e);
    }
  }, []);

  // ── Polling statut commandes (clients uniquement) ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId || user?.roleName !== 'CUSTOMER') return;
    const custOwnerId = user?.ownerId;
    if (!custOwnerId) return;

    const poll = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.ORDERS.BY_CUSTOMER(custOwnerId));
        const orders = res.data || [];
        const labels = {
          ACTIVE:    'En cours de préparation',
          CLOSED:    'Prête – en attente de service',
          SERVED:    'Servie',
          CANCELLED: 'Annulée',
        };
        orders.forEach(order => {
          const key  = 'order_' + order.orderId;
          const prev = lastStatusRef.current[key];
          if (prev && prev !== order.status) {
            sendToUser(custOwnerId, {
              type:    'order_status',
              title:   '🍽️ Commande mise à jour',
              message: `Commande #${order.orderId} : ${labels[order.status] || order.status}`,
            });
          }
          lastStatusRef.current[key] = order.status;
        });
      } catch {}
    };

    const init     = setTimeout(poll, 4000);
    const interval = setInterval(poll, 30000);
    return () => { clearTimeout(init); clearInterval(interval); };
  }, [isAuthenticated, userId, user, sendToUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    }, ...prev]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount,
      addNotification, markAsRead, markAllRead,
      deleteNotification, deleteAllNotifications,
      broadcastNotification, sendToUser,
      notifToast, dismissNotifToast: () => { clearTimeout(notifTimerRef.current); setNotifToast(null); },
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
