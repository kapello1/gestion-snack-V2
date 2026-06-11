import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { wsManager } from '../lib/wsManager';
import { toast } from 'react-toastify';

const NotificationContext = createContext(null);

// Suivi local des broadcasts lus (par userId) — évite l'aller-retour DB pour les broadcasts
const BROADCAST_READ_KEY = 'snack_broadcast_reads_';
const loadBroadcastReads = (userId) => {
  try { return JSON.parse(localStorage.getItem(BROADCAST_READ_KEY + userId) || '[]'); } catch { return []; }
};
const saveBroadcastReads = (userId, ids) => {
  try { localStorage.setItem(BROADCAST_READ_KEY + userId, JSON.stringify(ids)); } catch {}
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const lastStatusRef = useRef({});
  const loadedRef = useRef(false);

  const userId = user?.userId || null;

  // ──────────────────────────────────────────────
  // Chargement initial depuis la BD
  // ──────────────────────────────────────────────
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
      const readBroadcasts = loadBroadcastReads(uid);
      const normalized = data.map(n => ({
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

  // ──────────────────────────────────────────────
  // Écoute WebSocket — notifications en temps réel
  // ──────────────────────────────────────────────
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
        toast.info(
          <div className="flex flex-col gap-0.5 py-0.5">
            <p className="font-bold text-sm leading-tight text-gray-900">{newNotif.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{newNotif.message}</p>
          </div>,
          {
            autoClose: 5000,
            icon: newNotif.isBroadcast ? '📢' : '🔔',
            position: 'top-center',
          }
        );
        return [newNotif, ...prev];
      });
    });
  }, [userId]);

  // ──────────────────────────────────────────────
  // Actions utilisateur
  // ──────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId) => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    try {
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notifId));
    } catch {}
    // Aussi dans localStorage pour les broadcasts (idempotent)
    const reads = loadBroadcastReads(userId);
    if (!reads.includes(notifId)) saveBroadcastReads(userId, [...reads, notifId]);
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const broadcastIds = [];
    const personalIds = [];
    setNotifications(prev => {
      prev.forEach(n => {
        if (!n.read) {
          if (n.isBroadcast) broadcastIds.push(n.id);
          else personalIds.push(n.id);
        }
      });
      return prev.map(n => ({ ...n, read: true }));
    });
    // Persister lus dans localStorage (broadcasts)
    if (broadcastIds.length > 0) {
      const reads = loadBroadcastReads(userId);
      saveBroadcastReads(userId, [...new Set([...reads, ...broadcastIds])]);
    }
    // Persister lus en BD (messages personnels)
    await Promise.all(
      personalIds.map(id => api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)).catch(() => {}))
    );
  }, [userId]);

  /**
   * Envoie une notification personnelle à un autre utilisateur (par ownerId/customerId).
   * La notification est persistée en BD et diffusée via WebSocket.
   */
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

  /**
   * Envoie une notification broadcast à TOUS les utilisateurs connectés.
   * La notification est persistée en BD et diffusée via WebSocket.
   */
  const broadcastNotification = useCallback(async (message, title = "Message de l'administration") => {
    try {
      await api.post(API_ENDPOINTS.NOTIFICATIONS.BROADCAST, {
        title,
        content: message,
      });
    } catch (e) {
      console.error('[Notifications] Erreur broadcast:', e);
    }
  }, []);

  // ──────────────────────────────────────────────
  // Polling statut commandes (clients uniquement)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId || user?.roleName !== 'CUSTOMER') return;
    const custOwnerId = user?.ownerId;
    if (!custOwnerId) return;

    const poll = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.ORDERS.BY_CUSTOMER(custOwnerId));
        const orders = res.data || [];
        const labels = {
          ACTIVE: 'En cours de préparation',
          CLOSED: 'Prête – en attente de service',
          SERVED: 'Servie',
          CANCELLED: 'Annulée',
        };
        orders.forEach(order => {
          const key = 'order_' + order.orderId;
          const prev = lastStatusRef.current[key];
          if (prev && prev !== order.status) {
            // Envoi via API (sera aussi reçu via WS si l'utilisateur est connecté)
            sendToUser(custOwnerId, {
              type: 'order_status',
              title: '🍽️ Commande mise à jour',
              message: `Commande #${order.orderId} : ${labels[order.status] || order.status}`,
            });
          }
          lastStatusRef.current[key] = order.status;
        });
      } catch {}
    };

    const init = setTimeout(poll, 4000);
    const interval = setInterval(poll, 30000);
    return () => { clearTimeout(init); clearInterval(interval); };
  }, [isAuthenticated, userId, user, sendToUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // addNotification conservé pour compatibilité descendante (ex: pages legacy)
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
      broadcastNotification, sendToUser,
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
