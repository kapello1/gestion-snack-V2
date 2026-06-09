import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../lib/stripe';
import { Lock, ArrowLeft } from 'lucide-react';

const PaymentForm = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Paiement non confirmé. Veuillez réessayer.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white rounded-xl font-black text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Traitement...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Payer {amount.toFixed(2)} €
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Paiement sécurisé par Stripe · Carte de test : 4242 4242 4242 4242
      </p>
    </form>
  );
};

const StripePaymentForm = ({ clientSecret, amount, onSuccess, onCancel }) => {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        Stripe non configuré. Renseignez <code>VITE_STRIPE_PUBLISHABLE_KEY</code> dans le fichier{' '}
        <code>.env</code> du frontend.
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret, locale: 'fr' }}>
      <PaymentForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
};

export default StripePaymentForm;
