import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  public stripe: Stripe;
  public readonly mode: "test" | "live";

  constructor(private config: ConfigService) {
    this.mode = this.config.get("STRIPE_MODE", "test") === "live" ? "live" : "test";
    const secretKey = this.resolveKey("SECRET_KEY") || "sk_test_placeholder";
    this.stripe = new Stripe(secretKey);
  }

  /** Resolve a Stripe config value based on STRIPE_MODE (test/live). */
  resolveKey(suffix: string): string {
    const prefix = this.mode === "live" ? "STRIPE_LIVE" : "STRIPE_TEST";
    return this.config.get<string>(`${prefix}_${suffix}`, "");
  }
}
