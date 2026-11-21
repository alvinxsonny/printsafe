import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type User, type Session } from "./index";

export type Role = "customer" | "merchant" | "admin";

/**
 * Retrieves the current session and user server-side from request headers.
 */
export async function getServerSession(): Promise<{
  user: User;
  session: Session["session"];
} | null> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    return null;
  }

  return session as unknown as { user: User; session: Session["session"] };
}

/**
 * Enforces server-side authorization. Redirects or throws if user does not match the allowed role.
 */
export async function requireRole(allowedRoles: Role[]): Promise<{
  user: User;
  session: Session["session"];
}> {
  const current = await getServerSession();

  if (!current) {
    // Redirect to the appropriate login page based on requested role
    if (
      allowedRoles.includes("merchant") &&
      !allowedRoles.includes("customer")
    ) {
      redirect("/merchant/login");
    } else if (allowedRoles.includes("admin")) {
      redirect("/admin/login");
    } else {
      redirect("/login");
    }
  }

  const userRole = (current.user.role || "customer") as Role;

  if (!allowedRoles.includes(userRole)) {
    // If authenticated with wrong role, redirect to their home
    if (userRole === "merchant") {
      redirect("/merchant");
    } else if (userRole === "admin") {
      redirect("/admin");
    } else {
      redirect("/app");
    }
  }

  return current;
}

export async function requireCustomer() {
  return requireRole(["customer"]);
}

export async function requireMerchant() {
  return requireRole(["merchant"]);
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}
