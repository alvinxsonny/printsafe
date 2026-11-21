import { AuthForm } from "@/components/auth/AuthForm";

export default function AdminLoginPage() {
  return (
    <AuthForm
      entrance="admin_login"
      title="Admin Terminal"
      subtitle="Restricted to authorized PrintSafe team members listed in ADMIN_EMAILS."
      badgeText="RESTRICTED ADMIN ACCESS"
      badgeVariant="rejected"
      requireConsent={false}
      footerLink={{
        prompt: "Looking for customer entrance?",
        linkText: "Customer Login",
        href: "/login",
      }}
      altPortalLink={{
        prompt: "Merchant entrance?",
        linkText: "Merchant Portal →",
        href: "/merchant/login",
      }}
    />
  );
}
