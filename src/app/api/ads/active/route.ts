/**
 * API Route: GET /api/ads/active
 * Fetch toutes les campagnes actives du Smart-Stream Ad Matrix
 * Client public (pas d'authentification requise)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: NextRequest) {
  try {
    // Client avec service role (bypass RLS pour le read public)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('get_active_ad_campaigns');

    if (error) {
      console.error('GET /api/ads/active — RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch active campaigns' },
        { status: 500 }
      );
    }

    // Cache 10 secondes côté client + CDN
    const response = NextResponse.json({ ads: data || [] });
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return response;
  } catch (err) {
    console.error('GET /api/ads/active — Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
