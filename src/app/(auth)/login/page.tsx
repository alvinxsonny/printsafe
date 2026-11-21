import { AuthForm } from "@/components/auth/AuthForm";

export default function CustomerLoginPage() {
  return (
    <AuthForm
      entrance="customer_login"
      title="Access Customer Vault"
      subtitle="Log in with your email to view your encrypted documents and track active print jobs."
      badgeText="Customer Login"
      badgeVariant="info"
      requireConsent={false}
      footerLink={{
        prompt: "New to PrintSafe?",
        linkText: "Create a private vault",
        href: "/signup",
      }}
      altPortalLink={{
        prompt: "Own a print shop?",
        linkText: "Merchant Portal →",
        href: "/merchant/login",
      }}
    />
  );
}
