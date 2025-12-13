-- ============================================================================
-- CLEANUP: Remove legacy dejavoo_terminal_configs table and related columns
-- ============================================================================
--
-- PROBLEM: We had TWO places storing terminal config:
--   1. dejavoo_terminal_configs (EMPTY - never used)
--   2. payment_processors (ACTUAL source of truth)
--
-- This caused major confusion during development.
--
-- SOLUTION: Remove the legacy table and column, keep only payment_processors
-- Registers now link via payment_processor_id (already exists and works)
-- ============================================================================

-- Step 1: Drop the foreign key constraint from pos_registers
ALTER TABLE pos_registers
DROP CONSTRAINT IF EXISTS pos_registers_dejavoo_config_id_fkey;

-- Step 2: Drop the unused dejavoo_config_id column from pos_registers
-- (We now use payment_processor_id exclusively)
ALTER TABLE pos_registers
DROP COLUMN IF EXISTS dejavoo_config_id;

-- Step 3: Drop the legacy dejavoo_terminal_configs table entirely
DROP TABLE IF EXISTS dejavoo_terminal_configs;

-- ============================================================================
-- SINGLE SOURCE OF TRUTH: payment_processors table
-- ============================================================================
--
-- Registers link to processors via: pos_registers.payment_processor_id
-- Dejavoo config fields on payment_processors:
--   - dejavoo_merchant_id
--   - dejavoo_authkey
--   - dejavoo_v_number
--   - dejavoo_tpn
--   - dejavoo_store_number
--   - dejavoo_register_id
--
-- ============================================================================

-- Add comment to payment_processors for clarity
COMMENT ON TABLE payment_processors IS 'Single source of truth for all payment processor configs including Dejavoo terminals. Registers link via payment_processor_id.';

COMMENT ON COLUMN payment_processors.dejavoo_merchant_id IS 'Dejavoo Merchant ID (for processor_type=dejavoo)';
COMMENT ON COLUMN payment_processors.dejavoo_authkey IS 'Dejavoo Authentication Key';
COMMENT ON COLUMN payment_processors.dejavoo_v_number IS 'Dejavoo V-Number';
COMMENT ON COLUMN payment_processors.dejavoo_tpn IS 'Dejavoo TPN (Terminal Processing Number)';
COMMENT ON COLUMN payment_processors.dejavoo_store_number IS 'Dejavoo Store Number';
COMMENT ON COLUMN payment_processors.dejavoo_register_id IS 'Dejavoo Register ID';
