-- =====================================================================
--  Reparation des paiements Stripe enregistres a 0,00 EUR
--
--  Contexte : jusqu'a la correction de OrderServiceImpl.createOrder, le paiement Stripe d'une commande
--  etait enregistre avec un montant de 0,00 EUR (le total, calcule par un trigger de la base, n'etait pas
--  relu). Consequences : le chiffre d'affaires n'a jamais recu ces montants, et le remboursement Stripe
--  etait refuse ("This value must be greater than or equal to 1").
--
--  Ce script :
--    1. montre les transactions concernees (APERCU, ne modifie rien) ;
--    2. ajoute au chiffre d'affaires les montants manquants (paiements encore COMPLETED) ;
--    3. remplace le montant 0,00 des transactions par le total reel de la commande.
--
--  A executer UNE fois sur la base de production, APRES avoir deploye la version corrigee du backend.
--  Il est idempotent : une seconde execution ne modifie plus rien (les montants ne sont plus a 0).
--  Faire une sauvegarde avant (voir DEPLOIEMENT_OVH.md).
--
--  Usage (base sur le VPS) :  psql "<URL de connexion>" -f deploy/ovh/reparation_montants_stripe.sql
--  Usage (Neon)            :  coller le contenu dans le SQL Editor de la console Neon.
-- =====================================================================

-- 1. APERCU : transactions Stripe a corriger
SELECT t.idtransaction  AS transaction,
       t.order_id       AS commande,
       t.status         AS statut,
       t.amount         AS montant_enregistre,
       o.total_amount   AS total_commande,
       o.order_date     AS date_commande
FROM transactions t
JOIN orders o ON o.order_id = t.order_id
WHERE t.stripe_payment_intent_id IS NOT NULL
  AND t.amount = 0
  AND o.total_amount > 0
ORDER BY t.idtransaction;

-- 2. REPARATION (une seule transaction SQL : tout ou rien)
BEGIN;

-- 2a. Chiffre d'affaires : ajouter les montants jamais comptes.
--     Seuls les paiements encore COMPLETED comptent : un paiement deja REFUNDED n'a rien a ajouter
--     (le CA ne l'a jamais recu et ne doit pas le recevoir).
UPDATE revenue r
SET amount     = r.amount + x.manquant,
    updated_by = 'REPAIR_STRIPE',
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT o.order_date AS jour, SUM(o.total_amount) AS manquant
    FROM transactions t
    JOIN orders o ON o.order_id = t.order_id
    WHERE t.stripe_payment_intent_id IS NOT NULL
      AND t.amount = 0
      AND t.status = 'COMPLETED'
      AND o.total_amount > 0
    GROUP BY o.order_date
) x
WHERE r.date = x.jour;

-- 2b. Transactions : montant = total reel de la commande (COMPLETED et REFUNDED)
UPDATE transactions t
SET amount     = o.total_amount,
    updated_by = 'REPAIR_STRIPE',
    updated_at = CURRENT_TIMESTAMP
FROM orders o
WHERE o.order_id = t.order_id
  AND t.stripe_payment_intent_id IS NOT NULL
  AND t.amount = 0
  AND o.total_amount > 0;

COMMIT;

-- 3. CONTROLE : doit renvoyer 0 ligne
SELECT t.idtransaction AS transaction_encore_a_zero
FROM transactions t
JOIN orders o ON o.order_id = t.order_id
WHERE t.stripe_payment_intent_id IS NOT NULL
  AND t.amount = 0
  AND o.total_amount > 0;
