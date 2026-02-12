CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  caregiver_amount_cents INTEGER NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      WHERE b.recipient_id IN (SELECT id FROM care_recipients WHERE profile_id = auth.uid())
      OR b.caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage payments"
  ON payments FOR ALL
  TO service_role
  USING (true);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
