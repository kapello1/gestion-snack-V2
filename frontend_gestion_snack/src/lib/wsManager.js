import { Client } from '@stomp/stompjs';
import queryClient from './queryClient';
import { getToken } from '../utils/authToken';

/**
 * Construit l'URL WebSocket à partir de VITE_API_BASE_URL.
 * Ex: https://api.render.app/api  →  wss://api.render.app/ws
 *     http://localhost:8080/api   →  ws://localhost:8080/ws
 */
const buildWsUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  return base
    .replace(/\/api$/, '/ws')
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
};

let client = null;

// Callbacks enregistrés par des composants non-React-Query (ex: Dashboard)
const listeners = new Set();

// Callbacks pour les notifications personnelles et broadcasts
const notifListeners = new Set();

/**
 * Gestionnaire WebSocket singleton.
 * Une seule connexion STOMP est ouverte quelle que soit la route active.
 * Tous les événements entrants invalident le cache React Query ciblé et
 * notifient les listeners enregistrés via onEvent().
 */
export const wsManager = {
  connect(userId = null) {
    if (client?.active) return;

    client = new Client({
      brokerURL: buildWsUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      // Le navigateur ne permet pas d'ajouter un en-tête au handshake WebSocket : le JWT est donc envoyé
      // dans la trame STOMP CONNECT, relue à chaque (re)connexion. Sans jeton valide, on ne se connecte pas.
      beforeConnect(stompClient) {
        const token = getToken();
        if (!token) {
          stompClient.deactivate();
          return;
        }
        stompClient.connectHeaders = { Authorization: `Bearer ${token}` };
      },

      onConnect() {
        client.subscribe('/topic/orders', () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          listeners.forEach(fn => fn({ topic: 'orders' }));
        });

        client.subscribe('/topic/tables', () => {
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          listeners.forEach(fn => fn({ topic: 'tables' }));
        });

        client.subscribe('/topic/reservations', () => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          listeners.forEach(fn => fn({ topic: 'reservations' }));
        });

        client.subscribe('/topic/products', () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
          listeners.forEach(fn => fn({ topic: 'products' }));
        });

        client.subscribe('/topic/supplies', () => {
          queryClient.invalidateQueries({ queryKey: ['supplies'] });
          listeners.forEach(fn => fn({ topic: 'supplies' }));
        });

        client.subscribe('/topic/users', () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          listeners.forEach(fn => fn({ topic: 'users' }));
        });

        // Notification broadcast - reçue par tous les utilisateurs connectés
        client.subscribe('/topic/notifications/broadcast', (msg) => {
          try {
            const data = JSON.parse(msg.body);
            notifListeners.forEach(fn => fn({ ...data, isBroadcast: true }));
          } catch {}
        });

        // Notification personnelle - reçue uniquement par l'utilisateur connecté
        if (userId) {
          client.subscribe(`/topic/notifications/${userId}`, (msg) => {
            try {
              const data = JSON.parse(msg.body);
              notifListeners.forEach(fn => fn({ ...data, isBroadcast: false }));
            } catch {}
          });
        }
      },

      onStompError(frame) {
        const message = frame.headers?.message || '';
        console.warn('[WS] STOMP error:', message);
        // Jeton refusé (expiré, révoqué) : inutile de retenter en boucle, l'API renverra vers /login
        if (/jeton|authentification/i.test(message) && client) {
          client.reconnectDelay = 0;
          client.deactivate();
        }
      },

      onDisconnect() {
        console.info('[WS] Déconnecté du serveur');
      },
    });

    client.activate();
  },

  disconnect() {
    if (client) {
      client.deactivate();
      client = null;
    }
  },

  isConnected() {
    return !!client?.active;
  },

  /**
   * Enregistre un callback appelé à chaque événement WS reçu (données métier).
   * Retourne une fonction de désinscription.
   */
  onEvent(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /**
   * Enregistre un callback appelé à chaque notification WS reçue.
   * Retourne une fonction de désinscription.
   */
  onNotification(fn) {
    notifListeners.add(fn);
    return () => notifListeners.delete(fn);
  },
};
