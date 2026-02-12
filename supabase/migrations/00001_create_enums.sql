-- Custom enums for CareConnect
CREATE TYPE user_role AS ENUM ('caregiver', 'recipient');
CREATE TYPE education_level AS ENUM ('cna', 'lpn', 'rn', 'np', 'pt', 'ot', 'hha', 'md', 'other');
CREATE TYPE expertise_type AS ENUM (
  'elder_care', 'disability_care', 'post_surgery', 'chronic_disease',
  'physical_therapy', 'occupational_therapy', 'speech_therapy', 'mental_health',
  'medication_management', 'wound_care', 'palliative_care', 'pediatric_care',
  'dementia_care', 'respite_care', 'companion_care'
);
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE care_relationship AS ENUM ('self', 'loved_one');
CREATE TYPE notification_type AS ENUM (
  'booking_request', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
  'new_message', 'new_review', 'payment_received', 'payment_sent', 'reminder'
);
