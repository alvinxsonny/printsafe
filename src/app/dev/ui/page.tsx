"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import {
  Button3D,
  Card3D,
  Switch3D,
  Input,
  Select,
  Modal,
  Sheet,
  ToastProvider,
  useToast,
  Badge,
  Skeleton,
  EmptyState,
  Stepper,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  FileDropzone,
  Timeline,
  ThemeToggle,
  PaperStackIllustration,
  EmptyStateBoxIllustration,
  FootprintTreePlaceholder,
  Logo,
} from "@/components/ui";

function UIDevShowcase() {
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 md:p-12 space-y-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[var(--border)] gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Logo size={36} showText={false} />
            <h1 className="text-3xl font-extrabold tracking-tight">
              PrintSafe UI Kit
            </h1>
            <Badge variant="live" size="sm">
              Dev Only
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Interactive visual test harness for all 3D extruded design system
            components.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          1. Button3D Variants & Sizes
        </h2>
        <Card3D className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button3D variant="primary" size="lg">
              Primary LG
            </Button3D>
            <Button3D variant="primary" size="md">
              Primary MD
            </Button3D>
            <Button3D variant="primary" size="sm">
              Primary SM
            </Button3D>
            <Button3D variant="primary" isLoading>
              Loading
            </Button3D>
            <Button3D variant="primary" disabled>
              Disabled
            </Button3D>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button3D variant="secondary" size="lg">
              Secondary LG
            </Button3D>
            <Button3D variant="secondary" size="md">
              Secondary MD
            </Button3D>
            <Button3D variant="secondary" size="sm">
              Secondary SM
            </Button3D>
            <Button3D variant="secondary" disabled>
              Disabled
            </Button3D>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button3D variant="danger" size="md">
              Danger MD
            </Button3D>
            <Button3D variant="outline" size="md">
              Outline MD
            </Button3D>
            <Button3D variant="ghost" size="md">
              Ghost MD
            </Button3D>
          </div>
        </Card3D>
      </section>

      {/* 2. Switch3D & Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          2. Switch3D & Status Badges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card3D className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
              Physical Live Toggle
            </h3>
            <div className="flex items-center gap-4">
              <Switch3D checked={isLive} onCheckedChange={setIsLive} />
              <span className="text-sm font-semibold">
                Status:{" "}
                {isLive ? (
                  <span className="text-[#12724A] font-bold">ONLINE</span>
                ) : (
                  "OFFLINE"
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 opacity-60">
              <Switch3D checked={false} onCheckedChange={() => {}} disabled />
              <span className="text-xs text-[var(--text-muted)]">
                Disabled Toggle
              </span>
            </div>
          </Card3D>

          <Card3D className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
              Status Badges
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <Badge variant="live">LIVE SHOP</Badge>
              <Badge variant="offline">OFFLINE</Badge>
              <Badge variant="approved">APPROVED</Badge>
              <Badge variant="pending">PENDING REVIEW</Badge>
              <Badge variant="rejected">REJECTED</Badge>
              <Badge variant="info">NEAR MODE</Badge>
              <Badge variant="neutral">ARCHIVED</Badge>
            </div>
          </Card3D>
        </div>
      </section>

      {/* 3. Inputs & Select */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          3. Form Controls (Input & Select)
        </h2>
        <Card3D className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Shop Name"
            placeholder="e.g. Metro Xerox & Print Hub"
            helperText="Appears on public customer map"
          />
          <Input
            label="Per Page Price (₹)"
            defaultValue="2.00"
            className="tabular-nums"
            error="Price must be greater than zero"
          />
          <Select
            label="Paper Size"
            options={[
              { value: "a4", label: "A4 (Standard 210 x 297 mm)" },
              { value: "a3", label: "A3 (Large Ledger)" },
              { value: "legal", label: "Legal" },
            ]}
          />
        </Card3D>
      </section>

      {/* 4. Modals, Sheets & Toasts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          4. Overlays: Modal, Sheet & Toasts
        </h2>
        <Card3D className="flex flex-wrap items-center gap-4">
          <Button3D variant="secondary" onClick={() => setModalOpen(true)}>
            Open 3D Modal Dialog
          </Button3D>
          <Button3D variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Slide Sheet
          </Button3D>
          <Button3D
            variant="primary"
            onClick={() =>
              toast({
                title: "Job Accepted!",
                description: "Customer code generated successfully.",
                type: "success",
              })
            }
          >
            Trigger Success Toast
          </Button3D>
          <Button3D
            variant="danger"
            onClick={() =>
              toast({
                title: "Invalid Passcode",
                description: "2 attempts remaining before lock.",
                type: "error",
              })
            }
          >
            Trigger Error Toast
          </Button3D>
        </Card3D>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Document Print"
          description="Merchant is requesting access to job #PS-8821."
        >
          <p className="text-sm text-[var(--text-muted)] my-4">
            Watermarked pages will be rendered lazily. File content cannot be
            downloaded or transferred.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button3D
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button3D>
            <Button3D
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Unlock Viewer
            </Button3D>
          </div>
        </Modal>

        <Sheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Nearby Shop Details"
          side="right"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Metro Print Center (180 meters away)
            </p>
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-sm space-y-2">
              <div className="flex justify-between">
                <span>B&W Rate:</span>
                <span className="font-bold tabular-nums">₹2.00 / page</span>
              </div>
              <div className="flex justify-between">
                <span>Colour Rate:</span>
                <span className="font-bold tabular-nums">₹10.00 / page</span>
              </div>
            </div>
            <Button3D variant="primary" className="w-full">
              Send Print Request
            </Button3D>
          </div>
        </Sheet>
      </section>

      {/* 5. Stepper & Timeline */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          5. Stepper & Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card3D className="space-y-6">
            <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
              Interactive Stepper
            </h3>
            <Stepper
              currentStep={activeStep}
              steps={[
                { id: 1, label: "Google Link" },
                { id: 2, label: "Confirm Pin" },
                { id: 3, label: "Rates & Hours" },
                { id: 4, label: "Submit" },
              ]}
            />
            <div className="flex gap-2">
              <Button3D
                variant="outline"
                size="sm"
                disabled={activeStep <= 0}
                onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
              >
                Previous Step
              </Button3D>
              <Button3D
                variant="secondary"
                size="sm"
                disabled={activeStep >= 3}
                onClick={() => setActiveStep((p) => Math.min(3, p + 1))}
              >
                Next Step
              </Button3D>
            </div>
          </Card3D>

          <Card3D className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
              Job Status Timeline
            </h3>
            <Timeline
              events={[
                {
                  id: 1,
                  title: "Request Created",
                  timestamp: "10:30 AM",
                  description: "Job sent to Metro Print Center",
                  status: "completed",
                },
                {
                  id: 2,
                  title: "Merchant Accepted",
                  timestamp: "10:32 AM",
                  description: "Handover passcode generated",
                  status: "completed",
                },
                {
                  id: 3,
                  title: "Code Verified & Printing",
                  timestamp: "10:35 AM",
                  description: "Locked viewer active",
                  status: "current",
                },
                {
                  id: 4,
                  title: "Job Completed",
                  description: "Waiting for physical print handover",
                  status: "pending",
                },
              ]}
            />
          </Card3D>
        </div>
      </section>

      {/* 6. Dropzone & Skeletons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          6. FileDropzone & Skeletons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileDropzone onFilesSelected={() => {}} />
          <Card3D className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">
              Skeleton Shimmer Loaders
            </h3>
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 w-24 rounded-2xl" />
                <Skeleton className="h-10 w-24 rounded-2xl" />
              </div>
            </div>
          </Card3D>
        </div>
      </section>

      {/* 7. Tables */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          7. Dense Table (Tabular Numbers)
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Locality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>B&W Rate</TableHead>
              <TableHead>Jobs Today</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">Alpha Cyber Cafe</TableCell>
              <TableCell>Koramangala 4th Block</TableCell>
              <TableCell>
                <Badge variant="live" size="sm">
                  LIVE
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums font-semibold">
                ₹2.00
              </TableCell>
              <TableCell className="tabular-nums font-semibold">18</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">FastCopy Xerox</TableCell>
              <TableCell>Indiranagar 100ft Rd</TableCell>
              <TableCell>
                <Badge variant="offline" size="sm">
                  OFFLINE
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums font-semibold">
                ₹1.50
              </TableCell>
              <TableCell className="tabular-nums font-semibold">42</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">GreenPrint Express</TableCell>
              <TableCell>HSR Sector 2</TableCell>
              <TableCell>
                <Badge variant="approved" size="sm">
                  APPROVED
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums font-semibold">
                ₹2.50
              </TableCell>
              <TableCell className="tabular-nums font-semibold">7</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 8. Isometric Illustrations & Empty States */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">
          8. Isometric SVG Illustrations & Empty States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card3D className="flex flex-col items-center justify-center p-6 text-center">
            <PaperStackIllustration className="w-36 h-36 mb-3" />
            <h4 className="text-sm font-bold">PaperStackIllustration</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Multi-tier extruded 3D isometric documents
            </p>
          </Card3D>

          <Card3D className="flex flex-col items-center justify-center p-6 text-center">
            <FootprintTreePlaceholder className="w-36 h-36 mb-3" />
            <h4 className="text-sm font-bold">FootprintTreePlaceholder</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Isometric canopy placeholder (real tree in Phase 14)
            </p>
          </Card3D>

          <EmptyState
            title="Vault is Empty"
            description="Upload your Aadhaar or marksheet to keep it securely encrypted until you print."
            icon={<EmptyStateBoxIllustration className="w-28 h-28 mx-auto" />}
            action={
              <Button3D variant="primary" size="sm">
                Upload Document
              </Button3D>
            }
          />
        </div>
      </section>
    </div>
  );
}

export default function UIDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <ToastProvider>
      <UIDevShowcase />
    </ToastProvider>
  );
}
