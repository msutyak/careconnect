CREATE TABLE care_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  care_for care_relationship NOT NULL DEFAULT 'self',
  loved_one_first_name TEXT,
  loved_one_last_name TEXT,
  loved_one_age INTEGER,
  loved_one_relationship TEXT,
  care_needs TEXT[] NOT NULL DEFAULT '{}',
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE care_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view own record"
  ON care_recipients FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Recipients can update own record"
  ON care_recipients FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Recipients can insert own record"
  ON care_recipients FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE TRIGGER care_recipients_updated_at
  BEFORE UPDATE ON care_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create recipient record when profile with recipient role is created
CREATE OR REPLACE FUNCTION handle_recipient_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'recipient' THEN
    INSERT INTO care_recipients (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_recipient_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_recipient_profile();
