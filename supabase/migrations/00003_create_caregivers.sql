CREATE TABLE caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  education_level education_level,
  expertise expertise_type[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate_cents INTEGER NOT NULL DEFAULT 5000,
  license_number TEXT,
  license_state TEXT,
  years_experience INTEGER,
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view caregivers"
  ON caregivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Caregivers can update own record"
  ON caregivers FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Caregivers can insert own record"
  ON caregivers FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE TRIGGER caregivers_updated_at
  BEFORE UPDATE ON caregivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create caregiver record when profile with caregiver role is created
CREATE OR REPLACE FUNCTION handle_caregiver_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'caregiver' THEN
    INSERT INTO caregivers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_caregiver_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_caregiver_profile();
