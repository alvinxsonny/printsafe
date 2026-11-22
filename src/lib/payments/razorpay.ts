import crypto from "node:crypto";
import { env } from "@/lib/env";

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<RazorpayOrder>;
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  refund(params: RefundParams): Promise<RefundResult>;
}

/**
 * Native Razorpay HTTP Provider using direct Fetch API and crypto HMAC verification.
 * Zero external SDK bloat, works seamlessly in edge and node runtimes.
 */
export class RazorpayProvider implements PaymentProvider {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(
    keyId: string = env.RAZORPAY_KEY_ID,
    keySecret: string = env.RAZORPAY_KEY_SECRET,
    webhookSecret: string = env.RAZORPAY_WEBHOOK_SECRET
  ) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  private getAuthHeader(): string {
    const creds = `${this.keyId}:${this.keySecret}`;
    return `Basic ${Buffer.from(creds).toString("base64")}`;
  }

  /**
   * Creates an order with Razorpay in paise
   */
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
    const { amountPaise, currency = "INR", receipt, notes = {} } = params;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountPaise),
        currency,
        receipt,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg =
        data.error?.description ||
        data.error?.message ||
        "Failed to create Razorpay order";
      throw new Error(`Razorpay Error: ${errMsg}`);
    }

    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status,
    };
  }

  /**
   * Verifies the client checkout signature via constant-time HMAC SHA-256
   */
  verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    const { orderId, paymentId, signature } = params;
    if (!orderId || !paymentId || !signature) return false;

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(body)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifies incoming webhook signature via constant-time HMAC SHA-256
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!rawBody || !signature || !this.webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  /**
   * Issues an automated refund for a payment
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const { paymentId, amountPaise, notes = {} } = params;

    const body: Record<string, unknown> = { notes };
    if (amountPaise && amountPaise > 0) {
      body.amount = Math.round(amountPaise);
    }

    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      const errMsg =
        data.error?.description ||
        data.error?.message ||
        "Failed to process refund";
      throw new Error(`Razorpay Refund Error: ${errMsg}`);
    }

    return {
      id: data.id,
      paymentId: data.payment_id,
      amount: data.amount,
      status: data.status,
    };
  }
}

// Default singleton payment provider instance
export const paymentProvider: PaymentProvider = new RazorpayProvider();
