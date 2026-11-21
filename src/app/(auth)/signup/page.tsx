import { AuthForm } from "@/components/auth/AuthForm";

export default function CustomerSignUpPage() {
  return (
    <AuthForm
      entrance="customer_signup"
      title="Create Private Vault"
      subtitle="Upload your PDF or images securely. Print at any verified shop without sharing your contact info."
      badgeText="Customer Sign Up"
      badgeVariant="live"
      requireConsent={true}
      footerLink={{
        prompt: "Already have a vault?",
        linkText: "Log in here",
        href: "/login",
      }}
      altPortalLink={{
        prompt: "Are you a print shop owner?",
        linkText: "Merchant Portal →",
        href: "/merchant/login",
      }}
    />
  );
}
