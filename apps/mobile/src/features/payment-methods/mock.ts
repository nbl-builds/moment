import { cardBrand, type PaymentMethodKey } from '@moment/shared';

// MOCK: provider tokenisation. The real version sends the card or wallet number
// straight to the payment provider's SDK and gets back a token; our server only
// ever sees the token and display details. Swap this file when the provider is
// chosen (see docs/ROADMAP.md "To wire after UI").

export type TokenizeInput =
  | { kind: 'card'; number: string; expiry: string; cvc: string; holderName: string }
  | { kind: Exclude<PaymentMethodKey, 'card'>; phone: string };

export interface TokenizedMethod {
  kind: PaymentMethodKey;
  provider: 'mock';
  providerToken: string;
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  holderName?: string;
}

export async function tokenize(input: TokenizeInput): Promise<TokenizedMethod> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const providerToken = `mock_tok_${Math.random().toString(36).slice(2, 12)}`;
  if (input.kind === 'card') {
    const digits = input.number.replace(/\D/g, '');
    const [mm, yy] = input.expiry.split('/').map(Number) as [number, number];
    return {
      kind: 'card',
      provider: 'mock',
      providerToken,
      last4: digits.slice(-4),
      brand: cardBrand(digits),
      expMonth: mm,
      expYear: 2000 + yy,
      holderName: input.holderName,
    };
  }
  return { kind: input.kind, provider: 'mock', providerToken, last4: input.phone.replace(/\D/g, '').slice(-4) };
}
