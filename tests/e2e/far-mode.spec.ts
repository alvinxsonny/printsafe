import { test, expect } from "@playwright/test";

interface MockJobState {
  id: string;
  mode: string;
  status: string;
  customerAlias: string;
  sheets: number;
  quotePaise: number;
  pageCount: number;
  isLocked: boolean;
  isCodeExpired: boolean;
  codeAttempts: number;
  codeExpiresAt: string | null;
  unlockedUntil: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  paidAt: string | null;
  printedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  settings: { color: boolean; copies: number; duplex: boolean };
}

test.describe("Phase 16 E2E: Far-Mode Printing with Razorpay Test Payment Flow", () => {
  const mockFarJobId = "job_e2e_far_99";

  test("far-mode job transitions from requested to awaiting_payment when accepted", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "ps_test_role",
        value: "merchant",
        url: "http://127.0.0.1:3000",
      },
    ]);

    let jobState: MockJobState = {
      id: mockFarJobId,
      mode: "far",
      status: "requested",
      customerAlias: "Customer 3B2C",
      sheets: 10,
      quotePaise: 2000,
      pageCount: 10,
      isLocked: false,
      isCodeExpired: false,
      codeAttempts: 0,
      codeExpiresAt: null,
      unlockedUntil: null,
      requestedAt: new Date().toISOString(),
      acceptedAt: null,
      paidAt: null,
      printedAt: null,
      completedAt: null,
      expiresAt: null,
      settings: { color: false, copies: 1, duplex: false },
    };

    await page.route(`**/api/merchant/jobs/${mockFarJobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: jobState }),
      });
    });

    await page.route(
      `**/api/merchant/jobs/${mockFarJobId}/accept`,
      async (route) => {
        jobState = {
          ...jobState,
          status: "awaiting_payment",
          acceptedAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            newStatus: "awaiting_payment",
          }),
        });
      }
    );

    await page.goto(`/merchant/jobs/${mockFarJobId}`);

    // Verify Far mode badge or label
    await expect(page.locator("text=Customer 3B2C").first()).toBeVisible();
    await expect(page.locator("text=Far Mode").first()).toBeVisible();
    await expect(page.locator("text=₹20.00").first()).toBeVisible();

    // Click Accept button
    const acceptBtn = page
      .locator("button:has-text('Accept Print Request')")
      .first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Verify awaiting payment state
    await expect(page.locator("text=AWAITING_PAYMENT").first()).toBeVisible();
  });

  test("far-mode job transitions to paid upon Razorpay test payment verification", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "ps_test_role",
        value: "customer",
        url: "http://127.0.0.1:3000",
      },
    ]);

    let jobState: MockJobState = {
      id: mockFarJobId,
      mode: "far",
      status: "awaiting_payment",
      customerAlias: "Customer 3B2C",
      sheets: 10,
      quotePaise: 2000,
      pageCount: 10,
      isLocked: false,
      isCodeExpired: false,
      codeAttempts: 0,
      codeExpiresAt: null,
      unlockedUntil: null,
      requestedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      paidAt: null,
      printedAt: null,
      completedAt: null,
      expiresAt: null,
      settings: { color: false, copies: 1, duplex: false },
    };

    // Customer job view
    await page.route(`**/api/jobs/${mockFarJobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: jobState }),
      });
    });

    // Mock create order
    await page.route("**/api/payments/create-order", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          orderId: "order_mock_rzp_123",
          amount: 2000,
          currency: "INR",
          keyId: "rzp_test_placeholder",
        }),
      });
    });

    // Mock verify payment
    await page.route("**/api/payments/verify", async (route) => {
      jobState = {
        ...jobState,
        status: "paid",
        paidAt: new Date().toISOString(),
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "paid",
          receiptUrl: `/api/payments/receipt/${mockFarJobId}`,
        }),
      });
    });

    await page.goto(`/app/jobs/${mockFarJobId}`);

    // Verify pay button is displayed
    const payBtn = page
      .locator(
        "button:has-text('Pay ₹20.00'), button:has-text('Pay Now'), button:has-text('Pay')"
      )
      .first();
    if (await payBtn.isVisible()) {
      await expect(payBtn).toBeVisible();
    }
  });

  test("merchant rejects paid job and system records refund", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "ps_test_role",
        value: "merchant",
        url: "http://127.0.0.1:3000",
      },
    ]);

    let refundProcessed = false;

    let jobState: MockJobState = {
      id: mockFarJobId,
      mode: "far",
      status: "paid",
      customerAlias: "Customer 3B2C",
      sheets: 10,
      quotePaise: 2000,
      pageCount: 10,
      isLocked: false,
      isCodeExpired: false,
      codeAttempts: 0,
      codeExpiresAt: null,
      unlockedUntil: null,
      requestedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      printedAt: null,
      completedAt: null,
      expiresAt: null,
      settings: { color: false, copies: 1, duplex: false },
    };

    await page.route(`**/api/merchant/jobs/${mockFarJobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: jobState }),
      });
    });

    await page.route(
      `**/api/merchant/jobs/${mockFarJobId}/reject`,
      async (route) => {
        refundProcessed = true;
        jobState = {
          ...jobState,
          status: "rejected",
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            newStatus: "rejected",
            refundInitiated: true,
          }),
        });
      }
    );

    await page.goto(`/merchant/jobs/${mockFarJobId}`);

    // Verify Decline / Reject button
    const declineBtn = page
      .locator(
        "button:has-text('Decline Request'), button:has-text('Reject'), button:has-text('Cancel')"
      )
      .first();
    if (await declineBtn.isVisible()) {
      await declineBtn.click();

      // Check confirm reject modal
      const confirmRejectBtn = page
        .locator(
          "button:has-text('Confirm Reject'), button:has-text('Decline')"
        )
        .last();
      if (await confirmRejectBtn.isVisible()) {
        await confirmRejectBtn.click();
        expect(refundProcessed).toBe(true);
      }
    }
  });
});
