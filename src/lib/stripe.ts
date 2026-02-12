import { supabase } from './supabase';

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`
  : '';

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json',
  };
}

export async function createStripeConnectOnboardingLink(): Promise<string> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/stripe-connect-onboard`, {
    method: 'POST',
    headers,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create onboarding link');
  return data.url;
}

export async function createPaymentIntent(bookingId: string): Promise<{
  clientSecret: string;
  ephemeralKey: string;
  customerId: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${FUNCTIONS_URL}/stripe-create-payment-intent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bookingId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create payment intent');
  return data;
}
