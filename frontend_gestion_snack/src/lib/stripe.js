import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key || key.startsWith('pk_test_VOTRE')) {
      console.warn('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY non configuré — paiement par carte indisponible');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};
