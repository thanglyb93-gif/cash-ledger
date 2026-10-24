import { z } from "zod";

export const transactionFormSchema = z.object({
  txn_date: z.string().min(1, "Date is required"),
  direction: z.enum(["out", "in"]),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().length(3, "Use a 3-letter currency code"),
  money_account_id: z.string().uuid("Pick an account"),
  category_id: z.string().uuid().optional(),
  counterparty_id: z.string().uuid().optional(),
  counterparty_name: z.string().optional(), // create-on-the-fly when no id is picked
  description: z.string().optional(),
  reference: z.string().optional(),
  vat_amount: z.string().optional(),
  notes: z.string().optional(),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
