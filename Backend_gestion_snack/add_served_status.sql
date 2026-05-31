-- Add SERVED to order_status_type enum
ALTER TYPE order_status_type ADD VALUE IF NOT EXISTS 'SERVED';
