/**
 * The payment shape, without the server-only data access.
 *
 * lib/payments.ts is marked server-only so nothing can accidentally query the
 * schedule from a browser. The PDF renderer and the admin editor both need the
 * type though, so it lives here where anything may import it.
 */
export type Payment = {
  id: number;
  label: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  method: string;
  reference: string;
  notes: string;
};
