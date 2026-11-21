import { getServerSession } from "@/lib/auth/guards";
import { CustomerHomeClient } from "./CustomerHomeClient";

export const instant = false;

export default async function CustomerHomePage() {
  const session = await getServerSession();
  const alias = session?.user.alias || "Customer";

  return <CustomerHomeClient userAlias={alias} />;
}
