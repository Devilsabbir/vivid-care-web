-- Migration 013: Enable hourly billing
-- Adds hourly_rate to staff profiles and payment tracking to shifts.

-- Hourly rate stored on each staff member's profile (AUD per hour, decimal).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.hourly_rate IS
  'Hourly pay rate for staff (AUD). Used by the admin payments page to compute amounts owed from clocked-in/out times.';

-- Track which shifts have been paid out.
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid'));

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

COMMENT ON COLUMN shifts.payment_status IS
  'Billing status: ''pending'' until the admin marks the shift as paid, then ''paid''.';

COMMENT ON COLUMN shifts.paid_at IS
  'Timestamp the shift was marked paid by an admin. NULL for pending shifts.';

CREATE INDEX IF NOT EXISTS idx_shifts_payment_status ON shifts(payment_status);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_paid ON shifts(staff_id, payment_status);
