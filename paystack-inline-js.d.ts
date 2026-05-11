declare module "@paystack/inline-js" {
  interface PaystackTransaction {
    reference: string;
  }

  interface PaystackOptions {
    amount: number;
    callback_url?: string;
    currency?: string;
    email: string;
    key: string;
    metadata?: Record<string, unknown>;
    onCancel?: () => void;
    onError?: (error?: unknown) => void;
    onSuccess?: (transaction: PaystackTransaction) => void;
    reference?: string;
  }

  export default class Paystack {
    newTransaction(options: PaystackOptions): void;
  }
}
