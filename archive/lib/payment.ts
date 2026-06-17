/**
 * Abonnement Premium via Flutterwave (Mobile Money RDC + carte).
 *
 * Flutterwave couvre M-Pesa, Orange Money et Airtel Money en RDC.
 * Le checkout s'ouvre côté client (script inline). Activation :
 *   VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxx
 *
 * Sans clé → mode démo (active le premium en local pour les tests).
 *
 * ⚠️ Sécurité : en production, la confirmation du paiement DOIT être
 * vérifiée côté serveur (webhook Flutterwave → Supabase) avant d'accorder
 * le premium. Le callback client ci-dessous ne sert qu'à l'UX immédiate.
 */
import { logger } from '../utils/logger.ts';

const FLW_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY as string | undefined;
const PRICE_CDF = 2500; // 2 500 FC / mois

interface FlutterwaveResponse {
  status?: string;
  transaction_id?: number;
  tx_ref?: string;
}

interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: { email: string; name?: string };
  customizations: { title: string; description: string; logo?: string };
  callback: (resp: FlutterwaveResponse) => void;
  onclose: () => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveConfig) => void;
  }
}

export function paymentConfigured(): boolean {
  return Boolean(FLW_KEY);
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.flutterwave.com/v3.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Flutterwave script failed'));
    document.head.appendChild(s);
  });
}

/**
 * Démarre l'abonnement. `onSuccess` est appelé après un paiement réussi
 * (à remplacer par une vérification serveur en production).
 */
export async function startSubscription(
  email: string,
  onSuccess: () => void,
): Promise<void> {
  // Mode démo : pas de clé → on débloque localement
  if (!paymentConfigured()) {
    onSuccess();
    return;
  }

  try {
    await loadScript();
    if (!window.FlutterwaveCheckout) throw new Error('FlutterwaveCheckout indisponible');

    window.FlutterwaveCheckout({
      public_key: FLW_KEY as string,
      tx_ref: `aonoseke-${email}-${String(Math.floor(performance.now()))}`,
      amount: PRICE_CDF,
      currency: 'CDF',
      payment_options: 'mobilemoneyrwanda,mobilemoneyuganda,card,mpesa,mobilemoneyfranco',
      customer: { email, name: email.split('@')[0] },
      customizations: {
        title: 'Aonoseke IPTV — Premium',
        description: 'Abonnement mensuel · annuaire vérifié sans pub',
      },
      callback: (resp) => {
        // UX immédiate ; la vérité vient du webhook serveur
        if (resp.status === 'successful' || resp.status === 'completed') {
          onSuccess();
        }
      },
      onclose: () => { /* l'utilisateur a fermé le modal */ },
    });
  } catch (err) {
    logger.error('Paiement Flutterwave échoué', err as Error);
    // repli : ne débloque pas si la clé est présente mais le checkout casse
  }
}
