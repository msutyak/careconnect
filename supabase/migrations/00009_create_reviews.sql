CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Reviewers can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND booking_id IN (
      SELECT b.id FROM bookings b
      JOIN care_recipients cr ON cr.id = b.recipient_id
      WHERE cr.profile_id = auth.uid()
      AND b.status = 'completed'
    )
  );

CREATE POLICY "Caregivers can respond to reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    caregiver_id IN (SELECT id FROM caregivers WHERE profile_id = auth.uid())
  );

-- Trigger to update caregiver average rating
CREATE OR REPLACE FUNCTION update_caregiver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE caregivers
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE caregiver_id = NEW.caregiver_id
  ),
  total_reviews = (
    SELECT COUNT(*) FROM reviews WHERE caregiver_id = NEW.caregiver_id
  )
  WHERE id = NEW.caregiver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_caregiver_rating();

CREATE TRIGGER on_review_updated
  AFTER UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_caregiver_rating();

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_reviews_caregiver ON reviews(caregiver_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
