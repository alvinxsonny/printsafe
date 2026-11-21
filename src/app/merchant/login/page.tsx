import { AuthForm } from "@/components/auth/AuthForm";

export default function MerchantLoginPage() {
  return (
    <AuthForm
      entrance="merchant_login"
      title="Merchant Portal"
      subtitle="Access your print queue, live storefront toggle, pricing controls, and viewer."
      badgeText="Merchant Sign In"
      badgeVariant="info"
      requireConsent={false}
      footerLink={{
        prompt: "New shop owner?",
        linkText: "Register your print shop",
        href: "/merchant/signup",
      }}
      altPortalLink={{
        prompt: "Looking to print files?",
        linkText: "Customer Entrance →",
        href: "/login",
      }}
    />
  );
}
