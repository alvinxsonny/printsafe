import { AuthForm } from "@/components/auth/AuthForm";

export default function MerchantSignUpPage() {
  return (
    <AuthForm
      entrance="merchant_signup"
      title="Register Print Shop"
      subtitle="Accept zero-trust print requests directly from nearby customers without handling files or WhatsApp spam."
      badgeText="Merchant Registration"
      badgeVariant="live"
      requireConsent={false}
      footerLink={{
        prompt: "Already registered?",
        linkText: "Merchant log in",
        href: "/merchant/login",
      }}
      altPortalLink={{
        prompt: "Looking to print files?",
        linkText: "Customer Entrance →",
        href: "/login",
      }}
    />
  );
}
