CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT unique_slot UNIQUE (caregiver_id, day_of_week, start_time, end_time)
);

CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_unavailable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_override_time CHECK (
    is_unavailable = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

-- Availability slots policies
CREATE POLICY "Anyone can view availability slots"
  ON availability_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Caregivers can manage own slots"
  ON availability_slots FOR ALL
  TO authenticated
  USING (
    caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
  );

-- Availability overrides policies
CREATE POLICY "Anyone can view availability overrides"
  ON availability_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Caregivers can manage own overrides"
  ON availability_overrides FOR ALL
  TO authenticated
  USING (
    caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
  );

CREATE INDEX idx_availability_slots_caregiver ON availability_slots(caregiver_id);
CREATE INDEX idx_availability_overrides_caregiver_date ON availability_overrides(caregiver_id, date);
