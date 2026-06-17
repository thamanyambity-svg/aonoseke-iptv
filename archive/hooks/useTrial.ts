/**
 * Essai gratuit 30 jours + statut d'abonnement.
 *
 * - À la 1re ouverture : enregistre la date de début d'essai.
 * - Calcule les jours restants.
 * - Statut premium : localStorage maintenant (MVP), Supabase plus tard
 *   (table subscriptions + RLS). Sans backend, le premium se teste
 *   manuellement via localStorage 'iptv-premium' = 'true'.
 *
 * Règle d'accès :
 *   - Pendant l'essai (J0–J30)  → tout débloqué
 *   - Après J30 sans premium     → Annuaire verrouillé (player + pub restent)
 *   - Premium                    → tout débloqué, sans pub
 */
import { useState, useEffect } from 'react';

const TRIAL_KEY = 'iptv-trial-start';
const PREMIUM_KEY = 'iptv-premium';
const TRIAL_DAYS = 30;

export interface TrialState {
  daysLeft: number;
  trialActive: boolean;
  isPremium: boolean;
  /** L'annuaire est-il accessible ? (essai en cours OU premium) */
  annuaireUnlocked: boolean;
  /** Faut-il masquer les pubs ? (premium uniquement) */
  adsHidden: boolean;
}

function readTrialStart(): number {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (raw) return Number(raw);
    const now = Date.now();
    localStorage.setItem(TRIAL_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function readPremium(): boolean {
  try {
    return localStorage.getItem(PREMIUM_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useTrial(): TrialState {
  const [state, setState] = useState<TrialState>(() => compute());

  useEffect(() => {
    // Recalcule au montage + écoute les changements (paiement dans un autre onglet)
    setState(compute());
    const onStorage = (e: StorageEvent): void => {
      if (e.key === PREMIUM_KEY || e.key === TRIAL_KEY) setState(compute());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return state;
}

function compute(): TrialState {
  const start = readTrialStart();
  const isPremium = readPremium();
  const elapsedDays = Math.floor((Date.now() - start) / 86_400_000);
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsedDays);
  const trialActive = daysLeft > 0;
  return {
    daysLeft,
    trialActive,
    isPremium,
    annuaireUnlocked: trialActive || isPremium,
    adsHidden: isPremium,
  };
}
