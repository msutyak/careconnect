import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?1?\d{10,14}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['caregiver', 'recipient']),
});

export const caregiverPersonalSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
});

export const caregiverProfessionalSchema = z.object({
  educationLevel: z.string().min(1, 'Education level is required'),
  expertise: z.array(z.string()).min(1, 'Select at least one area of expertise'),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  yearsExperience: z.number().min(0).optional(),
  bio: z.string().min(20, 'Bio must be at least 20 characters').max(500),
});

export const caregiverRateSchema = z.object({
  hourlyRateDollars: z
    .number()
    .min(15, 'Minimum rate is $15/hr')
    .max(500, 'Maximum rate is $500/hr'),
});

export const recipientSelfSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
});

export const recipientLovedOneSchema = z.object({
  lovedOneFirstName: z.string().min(1, 'First name is required'),
  lovedOneLastName: z.string().min(1, 'Last name is required'),
  lovedOneAge: z.number().min(0).max(150).optional(),
  lovedOneRelationship: z.string().min(1, 'Relationship is required'),
});

export const recipientPreferencesSchema = z.object({
  careNeeds: z.array(z.string()).min(1, 'Select at least one care need'),
  additionalNotes: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  comment: z.string().min(10, 'Please write at least 10 characters').max(1000),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type CaregiverPersonalForm = z.infer<typeof caregiverPersonalSchema>;
export type CaregiverProfessionalForm = z.infer<typeof caregiverProfessionalSchema>;
export type CaregiverRateForm = z.infer<typeof caregiverRateSchema>;
export type RecipientSelfForm = z.infer<typeof recipientSelfSchema>;
export type RecipientLovedOneForm = z.infer<typeof recipientLovedOneSchema>;
export type RecipientPreferencesForm = z.infer<typeof recipientPreferencesSchema>;
export type ReviewForm = z.infer<typeof reviewSchema>;
