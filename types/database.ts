// Hand-written to match supabase/migrations/*.sql. Once the project is linked,
// regenerate with:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
// and re-add the hand-written RPC return types below if the generator drops them.
//
// Shape follows @supabase/supabase-js's expected Database generic exactly (every table needs
// Row/Insert/Update/Relationships, and the schema needs Views/Functions/Enums/CompositeTypes) --
// leaving any of those out makes the client silently fall back to `never` for every query result.

export type OrgRole = "owner" | "accountant" | "staff";
export type MoneyAccountType = "cash" | "bank" | "credit_card" | "owner_funds";
export type CategoryKind = "expense" | "income" | "transfer" | "tax";
export type CounterpartyKind = "vendor" | "customer" | "both";
export type TxnDirection = "out" | "in";
export type TxnStatus = "draft" | "confirmed" | "void";
export type TxnSource = "manual" | "receipt_ai" | "bank_import";
export type EvidenceStatus = "attached" | "missing" | "not_required";
export type DocumentKind = "receipt" | "e_invoice" | "bank_statement" | "other";
export type ExtractionStatus = "pending" | "done" | "failed" | "reviewed";

export type OrgRow = {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
};

export type OrgMemberRow = {
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type MoneyAccountRow = {
  id: string;
  org_id: string;
  name: string;
  type: MoneyAccountType;
  currency: string;
  bank_name: string | null;
  account_number_last4: string | null;
  opening_balance: number;
  opening_date: string;
  is_active: boolean;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  org_id: string;
  name: string;
  kind: CategoryKind;
  parent_id: string | null;
  gl_code: string | null;
  created_at: string;
};

export type CounterpartyRow = {
  id: string;
  org_id: string;
  name: string;
  tax_code: string | null;
  kind: CounterpartyKind;
  default_category_id: string | null;
  bank_account_hint: string | null;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  org_id: string;
  txn_date: string;
  direction: TxnDirection;
  amount: number;
  currency: string;
  money_account_id: string;
  category_id: string | null;
  counterparty_id: string | null;
  description: string | null;
  reference: string | null;
  vat_amount: number | null;
  status: TxnStatus;
  source: TxnSource;
  evidence_status: EvidenceStatus;
  created_by: string | null;
  journal_entry_id: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  org_id: string;
  storage_path: string;
  mime: string;
  kind: DocumentKind;
  extracted_json: Record<string, unknown> | null;
  extraction_status: ExtractionStatus;
  linked_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type JournalEntryRow = {
  id: string;
  org_id: string;
  entry_date: string;
  memo: string | null;
  source_table: string;
  source_id: string;
  created_at: string;
};

export type JournalLineRow = {
  id: string;
  entry_id: string;
  gl_account: string;
  debit: number;
  credit: number;
  currency: string;
  created_at: string;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      orgs: TableDef<OrgRow, Partial<OrgRow> & { name: string }, Partial<OrgRow>>;
      org_members: TableDef<
        OrgMemberRow,
        Partial<OrgMemberRow> & { org_id: string; user_id: string },
        Partial<OrgMemberRow>
      >;
      money_accounts: TableDef<
        MoneyAccountRow,
        Partial<MoneyAccountRow> & { org_id: string; name: string; type: MoneyAccountType; currency: string },
        Partial<MoneyAccountRow>
      >;
      categories: TableDef<
        CategoryRow,
        Partial<CategoryRow> & { org_id: string; name: string; kind: CategoryKind },
        Partial<CategoryRow>
      >;
      counterparties: TableDef<
        CounterpartyRow,
        Partial<CounterpartyRow> & { org_id: string; name: string },
        Partial<CounterpartyRow>
      >;
      transactions: TableDef<
        TransactionRow,
        never, // writes only via create_transaction_with_journal RPC
        Partial<
          Pick<TransactionRow, "description" | "reference" | "evidence_status" | "category_id" | "counterparty_id">
        >
      >;
      documents: TableDef<
        DocumentRow,
        Partial<DocumentRow> & { org_id: string; storage_path: string; mime: string },
        Partial<DocumentRow>
      >;
      journal_entries: TableDef<JournalEntryRow, never, never>;
      journal_lines: TableDef<JournalLineRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      create_org: {
        Args: { org_name: string; base_currency?: string };
        Returns: string;
      };
      add_org_member: {
        Args: { target_org: string; member_email: string; member_role?: OrgRole };
        Returns: string;
      };
      create_transaction_with_journal: {
        Args: {
          p_org_id: string;
          p_txn_date: string;
          p_direction: TxnDirection;
          p_amount: number;
          p_currency: string;
          p_money_account_id: string;
          p_category_id?: string | null;
          p_counterparty_id?: string | null;
          p_description?: string | null;
          p_reference?: string | null;
          p_vat_amount?: number | null;
          p_source?: TxnSource;
          p_evidence_status?: EvidenceStatus;
        };
        Returns: string;
      };
      void_transaction: {
        Args: { p_txn_id: string };
        Returns: void;
      };
      get_account_balances: {
        Args: { p_org_id: string };
        Returns: { money_account_id: string; balance: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
