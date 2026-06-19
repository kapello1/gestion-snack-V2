// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * Configuration par défaut d'Axios
 */
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Endpoints de l'API
export const API_ENDPOINTS = {
  // Authentification
  AUTH: {
    LOGIN: '/auth/login',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_RESET_CODE: '/auth/verify-reset-code',
  },
  // Utilisateurs
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    BY_USERNAME: (username) => `/users/username/${username}`,
    BY_ROLE: (roleId) => `/users/role/${roleId}`,
    CHANGE_PASSWORD: (id) => `/users/${id}/change-password`,
    DEACTIVATE: (id) => `/users/${id}/deactivate`,
    ACTIVATE: (id) => `/users/${id}/activate`,
  },
  // Clients
  CUSTOMERS: {
    BASE: '/customers',
    BY_ID: (id) => `/customers/${id}`,
    BY_EMAIL: (email) => `/customers/email/${email}`,
    BY_USERNAME: (username) => `/customers/username/${username}`,
    VERIFY_EMAIL: (token) => `/customers/verify/${token}`,
    VERIFY_EMAIL_CODE: '/customers/verify-email-code',
  },
  // Produits
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id) => `/products/${id}`,
    BY_TYPE: (type) => `/products/type/${type}`,
    LOW_STOCK: '/products/low-stock',
  },
  // Commandes
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    BY_STATUS: (status) => `/orders/status/${status}`,
    BY_TYPE: (type) => `/orders/type/${type}`,
    BY_DATE: (date) => `/orders/date/${date}`,
    BY_CUSTOMER: (customerId) => `/orders/customer/${customerId}`,
    BY_STATUS_AND_DATE: (status, date) => `/orders/status/${status}/date/${date}`,
    BY_CUSTOMER_AND_DATE: (customerId, date) => `/orders/customer/${customerId}/date/${date}`,
    CANCEL: (id) => `/orders/${id}/cancel`,
    CLOSE: (id) => `/orders/${id}/close`,
    SERVE: (id) => `/orders/${id}/serve`,
    PAY: (id) => `/orders/${id}/pay`,
  },
  // Tables
  TABLES: {
    BASE: '/tables',
    BY_ID: (id) => `/tables/${id}`,
    BY_STATUS: (status) => `/tables/status/${status}`,
    UPDATE_STATUS: (id) => `/tables/${id}/status`,
    RELEASE: (id) => `/tables/${id}/release`,
    ASSIGN_ORDER: (tableId, orderId) => `/tables/${tableId}/assign-order/${orderId}`,
  },
  // Réservations
  RESERVATIONS: {
    BASE: '/reservations',
    BY_ID: (id) => `/reservations/${id}`,
    BY_STATUS: (status) => `/reservations/status/${status}`,
    BY_DATE: (date) => `/reservations/date/${date}`,
    BY_CUSTOMER: (customerId) => `/reservations/customer/${customerId}`,
    CANCEL: (id) => `/reservations/${id}/cancel`,
  },
  // Employés
  EMPLOYEES: {
    BASE: '/employees',
    BY_ID: (id) => `/employees/${id}`,
    DEACTIVATE: (id) => `/employees/${id}/deactivate`,
    ACTIVATE: (id) => `/employees/${id}/activate`,
  },
  // Fournisseurs
  PROVIDERS: {
    BASE: '/providers',
    BY_ID: (id) => `/providers/${id}`,
    SUPPLIES: '/providers/supplies',
    BY_PROVIDER: (providerId) => `/providers/${providerId}/supplies`,
    CREATE_SUPPLY: '/providers/supplies',
  },
  // Avis
  REVIEWS: {
    BASE: '/reviews',
    BY_ID: (id) => `/reviews/${id}`,
    BY_CUSTOMER: (customerId) => `/reviews/customer/${customerId}`,
  },
  // Alertes de stock
  STOCK_ALERTS: {
    BASE: '/stock-alerts',
    BY_ID: (id) => `/stock-alerts/${id}`,
    UNRESOLVED: '/stock-alerts/unresolved',
    BY_PRODUCT: (productId) => `/stock-alerts/product/${productId}`,
    RESOLVE: (id) => `/stock-alerts/${id}/resolve`,
  },
  // Chiffre d'affaires
  REVENUE: {
    TOTAL: '/revenue/total',
    TODAY: '/revenue/today',
  },
  // Rôles
  ROLES: {
    BASE: '/roles',
    BY_ID: (id) => `/roles/${id}`,
  },
  // Sauces
  SAUCES: {
    BASE: '/sauces',
    BY_ID: (id) => `/sauces/${id}`,
    AVAILABLE: '/sauces/available',
  },
  // Desserts
  DESSERTS: {
    BASE: '/desserts',
    BY_ID: (id) => `/desserts/${id}`,
    AVAILABLE: '/desserts/available',
  },
  // Viandes
  VIANDES: {
    BASE: '/viandes',
    BY_ID: (id) => `/viandes/${id}`,
    AVAILABLE: '/viandes/available',
  },
  // Messages (Chatbot)
  MESSAGES: {
    BASE: '/messages',
    BY_ID: (id) => `/messages/${id}`,
    BY_USER: (userId) => `/messages/user/${userId}`,
  },
  // Notifications persistées en BD + synchronisées via WebSocket
  NOTIFICATIONS: {
    FOR_USER: (userId) => `/messages/notifications/${userId}`,
    PERSONAL: (ownerId) => `/messages/personal/${ownerId}`,
    BROADCAST: '/messages/broadcast',
    MARK_READ: (id) => `/messages/${id}/read`,
  },
  // Stripe - paiements en ligne
  STRIPE: {
    CREATE_PAYMENT_INTENT: '/stripe/create-payment-intent',
    CONFIRM_ORDER: '/stripe/confirm-order',
  },
};

export default API_ENDPOINTS;

