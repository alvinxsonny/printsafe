import { CustomerShell } from "@/components/layout/CustomerShell";
import { Card3D, Badge, Button3D } from "@/components/ui";
import { FolderLock, MapPin } from "lucide-react";
import Link from "next/link";

export default function CustomerHome() {
  return (
    <CustomerShell userAlias="Customer A7F2">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Your Document Vault
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Encrypted with per-document keys. Zero personal data shared with
              shops.
            </p>
          </div>
          <Badge variant="live">Live Connected</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card3D className="flex flex-col gap-4 p-6">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] extrude-sm">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Document Vault</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Upload Aadhaar, tax forms, or college submissions for secure
                one-time printing.
              </p>
            </div>
            <Link href="/app/vault">
              <Button3D variant="primary" size="sm" className="w-full">
                Open Vault
              </Button3D>
            </Link>
          </Card3D>

          <Card3D className="flex flex-col gap-4 p-6">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--info)] extrude-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Find Live Shops Nearby</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Locate verified Xerox and print shops currently online and ready
                to print.
              </p>
            </div>
            <Link href="/app">
              <Button3D variant="secondary" size="sm" className="w-full">
                View Live Map
              </Button3D>
            </Link>
          </Card3D>
        </div>
      </div>
    </CustomerShell>
  );
}
