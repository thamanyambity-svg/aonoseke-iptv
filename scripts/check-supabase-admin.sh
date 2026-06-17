#!/bin/zsh

# 🔍 Script de diagnostic rapide - État de Supabase
# Usage: ./scripts/check-supabase-admin.sh

set -e

echo "🔍 Diagnostic Supabase — Admin Role Check"
echo "========================================="
echo ""

# Récupérer les variables d'environnement
if [[ ! -f .env.local ]]; then
    echo "❌ Fichier .env.local non trouvé"
    echo "   Créez-le avec vos credentials Supabase"
    exit 1
fi

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.local | cut -d'=' -f2 | xargs)
SUPABASE_ANON=$(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d'=' -f2 | xargs)

if [[ -z "$SUPABASE_URL" ]]; then
    echo "❌ VITE_SUPABASE_URL non configurée dans .env.local"
    exit 1
fi

echo "✅ Supabase URL: $SUPABASE_URL"
echo "✅ Supabase Anon Key: ${SUPABASE_ANON:0:30}..."
echo ""

# Test 1: Vérifier la connexion
echo "📡 Test 1 — Vérifier la connexion Supabase..."
HEALTH=$(curl -s -w "\n%{http_code}" "${SUPABASE_URL}/rest/v1/" -H "apikey: $SUPABASE_ANON" | tail -1)
if [[ "$HEALTH" == "200" ]]; then
    echo "✅ Connexion réussie (HTTP 200)"
else
    echo "❌ Connexion échouée (HTTP $HEALTH)"
    exit 1
fi

echo ""
echo "📚 Test 2 — Vérifier les tables..."
TABLES=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?limit=1" \
    -H "apikey: $SUPABASE_ANON" \
    -H "Content-Type: application/json" \
    -X GET)

if [[ "$TABLES" == *"error"* ]]; then
    echo "❌ Table 'profiles' inaccessible ou non existe"
    echo "   Réponse: $TABLES"
else
    echo "✅ Table 'profiles' existe et accessible"
fi

echo ""
echo "🎯 Test 3 — Vérifier les RPC admin..."
RPCS=("admin_stats" "admin_online_users" "is_admin" "track_ad_event")
for RPC in "${RPCS[@]}"; do
    RESULT=$(curl -s "${SUPABASE_URL}/rest/v1/rpc/$RPC" \
        -H "apikey: $SUPABASE_ANON" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{}' 2>&1)
    
    if [[ "$RESULT" == *"not exist"* ]] || [[ "$RESULT" == *"does not exist"* ]]; then
        echo "❌ RPC '$RPC' n'existe pas → Schéma SQL non appliqué"
    elif [[ "$RESULT" == *"permission"* ]]; then
        echo "⚠️  RPC '$RPC' existe mais permission refusée"
    else
        echo "✅ RPC '$RPC' accessible"
    fi
done

echo ""
echo "========================================="
echo "✅ Diagnostic complet"
echo ""
echo "Prochaines étapes:"
echo "1. Si RPC manquantes → Appliquer schema.sql"
echo "2. Si permissions → Vérifier RLS policies"
echo "3. Vérifier rôle admin dans table profiles"
