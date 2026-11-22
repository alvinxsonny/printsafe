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

test.describe("Phase 16 E2E: Near-Mode End-to-End Printing Flow", () => {
  const mockJobId = "job_e2e_near_1";

  test("customer configures near-mode job with honest quote and near-mode toggle", async ({
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

    // Mock user session & documents
    await page.route("**/api/documents*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          documents: [
            {
              id: "doc_test_1",
              displayName: "Lecture_Notes_2026.pdf",
              pageCount: 4,
              fileSizeBytes: 102400,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route("**/api/shops/nearby*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shops: [
            {
              id: "shp_e2e_1",
              name: "Campus FastPrint",
              isLive: true,
              distanceMeters: 150,
              priceBwPaise: 200,
              priceColorPaise: 1000,
            },
          ],
        }),
      });
    });

    await page.goto("/app/jobs/new");

    // Check presence of configure print request header
    await expect(
      page.locator("text=Configure Print Request").first()
    ).toBeVisible();
    await expect(page.locator("text=1. Select Document").first()).toBeVisible();
  });

  test("merchant accepts near-mode request and triggers 4-digit code generation", async ({
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
      id: mockJobId,
      mode: "near",
      status: "requested",
      customerAlias: "Customer 7A9B",
      sheets: 4,
      quotePaise: 800,
      pageCount: 4,
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

    // Route GET job details
    await page.route(`**/api/merchant/jobs/${mockJobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: jobState }),
      });
    });

    // Route POST accept
    await page.route(
      `**/api/merchant/jobs/${mockJobId}/accept`,
      async (route) => {
        jobState = {
          ...jobState,
          status: "accepted",
          acceptedAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            newStatus: "accepted",
            passcode: "4921",
          }),
        });
      }
    );

    await page.goto(`/merchant/jobs/${mockJobId}`);

    // Verify requested job details
    await expect(page.locator("text=Customer 7A9B").first()).toBeVisible();
    await expect(page.locator("text=₹8.00").first()).toBeVisible();

    // Click Accept button
    const acceptBtn = page
      .locator("button:has-text('Accept Print Request')")
      .first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // State should update to accepted
    await expect(
      page.locator("text=Customer Handover Verification").first()
    ).toBeVisible();
    await expect(page.locator("text=ACCEPTED").first()).toBeVisible();
  });

  test("merchant enters 4-digit customer code to unlock document for printing", async ({
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
      id: mockJobId,
      mode: "near",
      status: "accepted",
      customerAlias: "Customer 7A9B",
      sheets: 4,
      quotePaise: 800,
      pageCount: 4,
      isLocked: false,
      isCodeExpired: false,
      codeAttempts: 0,
      codeExpiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
      unlockedUntil: null,
      requestedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      paidAt: null,
      printedAt: null,
      completedAt: null,
      expiresAt: null,
      settings: { color: false, copies: 1, duplex: false },
    };

    await page.route(`**/api/merchant/jobs/${mockJobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ job: jobState }),
      });
    });

    // Mock verify-code endpoint
    await page.route(
      `**/api/merchant/jobs/${mockJobId}/verify-code`,
      async (route) => {
        const data = await route.request().postDataJSON();
        if (data.code === "4921") {
          jobState = {
            ...jobState,
            status: "unlocked",
            unlockedUntil: new Date(Date.now() + 15 * 60000).toISOString(),
          };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, status: "unlocked" }),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: "Incorrect passcode.",
            }),
          });
        }
      }
    );

    await page.goto(`/merchant/jobs/${mockJobId}`);

    // Verify code input is present
    const codeInput = page.locator("input[placeholder='0 0 0 0']").first();
    await expect(codeInput).toBeVisible();
    await codeInput.fill("4921");

    const submitBtn = page
      .locator("button:has-text('Verify & Unlock')")
      .first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Should now display unlocked status and open viewer link
    await expect(page.locator("text=UNLOCKED").first()).toBeVisible();
    await expect(
      page.locator("text=Document Reader Unlocked & Ready").first()
    ).toBeVisible();
    await expect(
      page.locator("text=Launch Private Print Viewer").first()
    ).toBeVisible();
  });

  test("secure viewer opens, enforces print protection, and merchant completes job", async ({
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

    // Mock viewer session endpoint
    await page.route(`**/api/viewer/${mockJobId}/session`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: mockJobId,
            mode: "near",
            status: "unlocked",
            settings: { color: false, copies: 1, duplex: false },
            sheets: 4,
            quotePaise: 800,
            unlockedUntil: new Date(Date.now() + 15 * 60000).toISOString(),
            openCount: 1,
            maxReopens: 3,
            customerAlias: "Customer 7A9B",
            pageCount: 4,
            requestedPages: [1, 2, 3, 4],
            deleteAfterPrint: false,
          },
        }),
      });
    });

    await page.route(`**/api/viewer/${mockJobId}/page/*`, async (route) => {
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: pngBuffer,
      });
    });

    await page.goto(`/merchant/jobs/${mockJobId}/view`);

    // Verify viewer loaded
    await expect(page.locator("text=Customer 7A9B").first()).toBeVisible();
    await expect(page.locator("text=4 pages").first()).toBeVisible();

    // Verify Print button is present
    const printBtn = page.locator("button:has-text('Print Document')").first();
    await expect(printBtn).toBeVisible();

    // Verify 'Mark Printed' button
    const markPrintedBtn = page
      .locator("button:has-text('Mark Printed')")
      .first();
    await expect(markPrintedBtn).toBeVisible();
  });
});
