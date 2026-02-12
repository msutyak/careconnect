export const EXPERTISE_OPTIONS = [
  { label: 'Elder Care', value: 'elder_care' },
  { label: 'Disability Care', value: 'disability_care' },
  { label: 'Post-Surgery Recovery', value: 'post_surgery' },
  { label: 'Chronic Disease Management', value: 'chronic_disease' },
  { label: 'Physical Therapy', value: 'physical_therapy' },
  { label: 'Occupational Therapy', value: 'occupational_therapy' },
  { label: 'Speech Therapy', value: 'speech_therapy' },
  { label: 'Mental Health Support', value: 'mental_health' },
  { label: 'Medication Management', value: 'medication_management' },
  { label: 'Wound Care', value: 'wound_care' },
  { label: 'Palliative Care', value: 'palliative_care' },
  { label: 'Pediatric Care', value: 'pediatric_care' },
  { label: 'Dementia / Alzheimer\'s Care', value: 'dementia_care' },
  { label: 'Respite Care', value: 'respite_care' },
  { label: 'Companion Care', value: 'companion_care' },
] as const;

export const EDUCATION_LEVELS = [
  { label: 'Certified Nursing Assistant (CNA)', value: 'cna' },
  { label: 'Licensed Practical Nurse (LPN)', value: 'lpn' },
  { label: 'Registered Nurse (RN)', value: 'rn' },
  { label: 'Nurse Practitioner (NP)', value: 'np' },
  { label: 'Physical Therapist', value: 'pt' },
  { label: 'Occupational Therapist', value: 'ot' },
  { label: 'Home Health Aide (HHA)', value: 'hha' },
  { label: 'Medical Doctor (MD)', value: 'md' },
  { label: 'Other', value: 'other' },
] as const;

export const CARE_NEEDS_OPTIONS = [
  { label: 'Daily Living Assistance', value: 'daily_living' },
  { label: 'Medication Reminders', value: 'medication' },
  { label: 'Physical Therapy', value: 'physical_therapy' },
  { label: 'Wound Care', value: 'wound_care' },
  { label: 'Meal Preparation', value: 'meal_prep' },
  { label: 'Transportation', value: 'transportation' },
  { label: 'Companionship', value: 'companionship' },
  { label: 'Mobility Assistance', value: 'mobility' },
  { label: 'Bathing & Grooming', value: 'bathing_grooming' },
  { label: 'Post-Surgery Care', value: 'post_surgery' },
  { label: 'Chronic Condition Management', value: 'chronic_condition' },
  { label: 'Memory Care', value: 'memory_care' },
] as const;

export type ExpertiseType = (typeof EXPERTISE_OPTIONS)[number]['value'];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['value'];
export type CareNeedType = (typeof CARE_NEEDS_OPTIONS)[number]['value'];
