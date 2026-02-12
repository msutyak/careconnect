CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES care_recipients(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  caregiver_amount_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_time CHECK (start_time < end_time)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    recipient_id IN (SELECT id FROM care_recipients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Caregivers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Recipients can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient_id IN (SELECT id FROM care_recipients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Participants can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    recipient_id IN (SELECT id FROM care_recipients WHERE profile_id = auth.uid())
    OR caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
  );

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bookings_recipient ON bookings(recipient_id);
CREATE INDEX idx_bookings_caregiver ON bookings(caregiver_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
