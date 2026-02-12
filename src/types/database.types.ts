export type UserRole = 'caregiver' | 'recipient';

export type EducationLevel =
  | 'cna'
  | 'lpn'
  | 'rn'
  | 'np'
  | 'pt'
  | 'ot'
  | 'hha'
  | 'md'
  | 'other';

export type ExpertiseType =
  | 'elder_care'
  | 'disability_care'
  | 'post_surgery'
  | 'chronic_disease'
  | 'physical_therapy'
  | 'occupational_therapy'
  | 'speech_therapy'
  | 'mental_health'
  | 'medication_management'
  | 'wound_care'
  | 'palliative_care'
  | 'pediatric_care'
  | 'dementia_care'
  | 'respite_care'
  | 'companion_care';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type CareRelationship = 'self' | 'loved_one';

export type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'new_message'
  | 'new_review'
  | 'payment_received'
  | 'payment_sent'
  | 'reminder';

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  avatar_url: string | null;
  push_token: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Caregiver {
  id: string;
  profile_id: string;
  bio: string | null;
  education_level: EducationLevel | null;
  expertise: ExpertiseType[];
  interests: string[];
  hourly_rate_cents: number;
  license_number: string | null;
  license_state: string | null;
  years_experience: number | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  average_rating: number;
  total_reviews: number;
  total_bookings: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface CareRecipient {
  id: string;
  profile_id: string;
  care_for: CareRelationship;
  loved_one_first_name: string | null;
  loved_one_last_name: string | null;
  loved_one_age: number | null;
  loved_one_relationship: string | null;
  care_needs: string[];
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface AvailabilitySlot {
  id: string;
  caregiver_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityOverride {
  id: string;
  caregiver_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_unavailable: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  recipient_id: string;
  caregiver_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_amount_cents: number;
  platform_fee_cents: number;
  caregiver_amount_cents: number;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  caregiver?: Caregiver & { profile: Profile };
  recipient?: CareRecipient & { profile: Profile };
}

export interface Payment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  caregiver_amount_cents: number;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  other_participant?: Profile;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  caregiver_id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
}
