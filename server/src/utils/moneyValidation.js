import { z } from 'zod';

const MAX_AMOUNT = 100000000;

function hasAtMostTwoDecimals(amount) {
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
}

export const positiveAmountSchema = z.number()
  .positive()
  .max(MAX_AMOUNT)
  .refine(hasAtMostTwoDecimals, {
    error: 'Amount can have at most two decimal places.'
  });

export const nonNegativeAmountSchema = z.number()
  .min(0)
  .max(MAX_AMOUNT)
  .refine(hasAtMostTwoDecimals, {
    error: 'Amount can have at most two decimal places.'
  });

export const goalInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  target: positiveAmountSchema,
  saved: nonNegativeAmountSchema.optional(),
  targetDate: z.iso.datetime().optional()
}).refine(
  data => (data.saved ?? 0) <= data.target,
  {
    path: ['saved'],
    error: 'Saved amount cannot exceed the goal target.'
  }
);
