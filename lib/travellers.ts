import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

/**
 * The people a customer travels with.
 *
 * Held so nobody retypes a passport spelling into a booking form at midnight —
 * a misspelt name is the single most common reason a hotel or airline booking
 * has to be reissued.
 */

export type Traveller = {
  id: number;
  fullName: string;
  label: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportCountry: string;
  notes: string;
};

export function mapTraveller(row: any): Traveller {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    label: row.label ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    nationality: row.nationality ?? '',
    passportNumber: row.passport_number ?? '',
    passportExpiry: row.passport_expiry ?? '',
    passportCountry: row.passport_country ?? '',
    notes: row.notes ?? '',
  };
}

export async function getTravellers(customerId: string): Promise<Traveller[]> {
  if (!isSupabaseConfigured()) return [];
  const db = createAdminClient();
  const { data } = await db
    .from('travellers')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at');
  return (data ?? []).map(mapTraveller);
}

/**
 * Most carriers want six months left on a passport at the date of travel, so a
 * passport that is technically still valid can still stop a trip. Warning at
 * six months gives a customer time to renew rather than news at the airport.
 */
export function passportWarning(expiry: string): string | null {
  if (!expiry) return null;
  const end = new Date(`${expiry}T00:00:00Z`).getTime();
  if (Number.isNaN(end)) return null;

  const days = Math.round((end - Date.now()) / 86_400_000);
  if (days < 0) return 'This passport has expired.';
  if (days < 183) return 'Under six months left — many airlines will refuse this.';
  return null;
}

/** Never show a full passport number where it does not need to be seen. */
export function maskPassport(value: string) {
  const v = value.trim();
  if (v.length < 4) return v ? '••••' : '';
  return `${'•'.repeat(Math.max(2, v.length - 4))}${v.slice(-4)}`;
}
