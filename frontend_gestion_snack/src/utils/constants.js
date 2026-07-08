// Constantes de l'application

// Rôles des utilisateurs
export const ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  CASHIER: 'CASHIER',
  WAITER: 'WAITER',
  COOK: 'COOK',
  PROVIDER: 'PROVIDER',
};

// Statuts des commandes
export const ORDER_STATUS = {
  ACTIVE:         'ACTIVE',
  IN_PREPARATION: 'IN_PREPARATION',
  CLOSED:         'CLOSED',
  SERVED:         'SERVED',
  CANCELLED:      'CANCELLED',
};

// Types de documents
export const DOCUMENT_TYPE = {
  TICKET: 'TICKET',
  INVOICE: 'INVOICE',
};

// Types de commandes
export const ORDER_TYPE = {
  ON_SITE: 'ON_SITE',
  TAKEAWAY: 'TAKEAWAY',
};

// Méthodes de paiement
export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
};

// Types de produits
export const PRODUCT_TYPE = {
  FOOD: 'FOOD',
  DRINK: 'DRINK',
};

// Statuts des tables
export const TABLE_STATUS = {
  FREE: 'FREE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
};

// Statuts des réservations
export const RESERVATION_STATUS = {
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
};

// Libellés en français
export const LABELS = {
  ROLES: {
    [ROLES.ADMIN]: 'Administrateur',
    [ROLES.CUSTOMER]: 'Client',
    [ROLES.CASHIER]: 'Caissier',
    [ROLES.WAITER]: 'Serveur',
    [ROLES.COOK]: 'Cuisinier',
    [ROLES.PROVIDER]: 'Fournisseur',
  },
  ORDER_STATUS: {
    [ORDER_STATUS.ACTIVE]:         'En attente de préparation',
    [ORDER_STATUS.IN_PREPARATION]: 'En cours de préparation',
    [ORDER_STATUS.CLOSED]:         'Prête à servir',
    [ORDER_STATUS.SERVED]:         'Servie au client',
    [ORDER_STATUS.CANCELLED]:      'Annulée / Remboursée',
  },
  DOCUMENT_TYPE: {
    [DOCUMENT_TYPE.TICKET]: 'Ticket de caisse',
    [DOCUMENT_TYPE.INVOICE]: 'Facture',
  },
  ORDER_TYPE: {
    [ORDER_TYPE.ON_SITE]: 'Sur place',
    [ORDER_TYPE.TAKEAWAY]: 'À emporter',
  },
  PAYMENT_METHOD: {
    [PAYMENT_METHOD.CASH]: 'Espèces',
    [PAYMENT_METHOD.CARD]: 'Carte',
  },
  PRODUCT_TYPE: {
    [PRODUCT_TYPE.FOOD]: 'Nourriture',
    [PRODUCT_TYPE.DRINK]: 'Boisson',
  },
  TABLE_STATUS: {
    [TABLE_STATUS.FREE]: 'Libre',
    [TABLE_STATUS.OCCUPIED]: 'Occupée',
    [TABLE_STATUS.RESERVED]: 'Réservée',
  },
  RESERVATION_STATUS: {
    [RESERVATION_STATUS.BOOKED]: 'Réservée',
    [RESERVATION_STATUS.CANCELLED]: 'Annulée',
    [RESERVATION_STATUS.COMPLETED]: 'Terminée',
  },
};

// Couleurs selon les statuts
export const STATUS_COLORS = {
  ORDER: {
    [ORDER_STATUS.ACTIVE]:         'bg-yellow-100 text-yellow-800',
    [ORDER_STATUS.IN_PREPARATION]: 'bg-orange-100 text-orange-800',
    [ORDER_STATUS.CLOSED]:         'bg-blue-100 text-blue-800',
    [ORDER_STATUS.SERVED]:         'bg-green-100 text-green-800',
    [ORDER_STATUS.CANCELLED]:      'bg-red-100 text-red-800',
  },
  TABLE: {
    [TABLE_STATUS.FREE]: 'bg-green-100 text-green-800',
    [TABLE_STATUS.OCCUPIED]: 'bg-yellow-100 text-yellow-800',
    [TABLE_STATUS.RESERVED]: 'bg-blue-100 text-blue-800',
  },
  RESERVATION: {
    [RESERVATION_STATUS.BOOKED]: 'bg-blue-100 text-blue-800',
    [RESERVATION_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
    [RESERVATION_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  },
};
