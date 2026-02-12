-- Search function for finding available caregivers with filters
CREATE OR REPLACE FUNCTION search_available_caregivers(
  p_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_expertise expertise_type[] DEFAULT NULL,
  p_education education_level[] DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_max_rate INTEGER DEFAULT NULL,
  p_min_rate INTEGER DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'rating',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  caregiver_id UUID,
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  bio TEXT,
  education_level education_level,
  expertise expertise_type[],
  hourly_rate_cents INTEGER,
  average_rating NUMERIC,
  total_reviews INTEGER,
  total_bookings INTEGER,
  years_experience INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS caregiver_id,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.city,
    p.state,
    c.bio,
    c.education_level,
    c.expertise,
    c.hourly_rate_cents,
    c.average_rating,
    c.total_reviews,
    c.total_bookings,
    c.years_experience
  FROM caregivers c
  JOIN profiles p ON p.id = c.profile_id
  WHERE c.is_available = TRUE
    AND p.onboarding_completed = TRUE
    -- Expertise filter
    AND (p_expertise IS NULL OR c.expertise && p_expertise)
    -- Education filter
    AND (p_education IS NULL OR c.education_level = ANY(p_education))
    -- Rating filter
    AND (p_min_rating IS NULL OR c.average_rating >= p_min_rating)
    -- Rate filter
    AND (p_max_rate IS NULL OR c.hourly_rate_cents <= p_max_rate)
    AND (p_min_rate IS NULL OR c.hourly_rate_cents >= p_min_rate)
    -- Location filters
    AND (p_state IS NULL OR p.state = p_state)
    AND (p_city IS NULL OR p.city ILIKE '%' || p_city || '%')
    -- Text search
    AND (
      p_search_text IS NULL
      OR p.first_name ILIKE '%' || p_search_text || '%'
      OR p.last_name ILIKE '%' || p_search_text || '%'
      OR c.bio ILIKE '%' || p_search_text || '%'
    )
    -- Date/time availability check
    AND (
      p_date IS NULL
      OR (
        -- Has a slot for the day of week
        EXISTS (
          SELECT 1 FROM availability_slots s
          WHERE s.caregiver_id = c.id
          AND s.day_of_week = LOWER(TO_CHAR(p_date, 'FMDay'))::day_of_week
          AND (p_start_time IS NULL OR s.start_time <= p_start_time)
          AND (p_end_time IS NULL OR s.end_time >= p_end_time)
        )
        -- And no unavailable override for that date
        AND NOT EXISTS (
          SELECT 1 FROM availability_overrides o
          WHERE o.caregiver_id = c.id
          AND o.date = p_date
          AND o.is_unavailable = TRUE
        )
        -- And no conflicting booking
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.caregiver_id = c.id
          AND b.date = p_date
          AND b.status IN ('confirmed', 'in_progress')
          AND (
            (p_start_time IS NULL AND p_end_time IS NULL)
            OR (b.start_time < COALESCE(p_end_time, b.end_time) AND b.end_time > COALESCE(p_start_time, b.start_time))
          )
        )
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'rating' THEN c.average_rating END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'price_low' THEN c.hourly_rate_cents END ASC,
    CASE WHEN p_sort_by = 'price_high' THEN c.hourly_rate_cents END DESC,
    CASE WHEN p_sort_by = 'reviews' THEN c.total_reviews END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'experience' THEN c.years_experience END DESC NULLS LAST,
    c.average_rating DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
