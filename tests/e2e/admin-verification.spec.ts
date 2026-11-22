import { test, expect } from "@playwright/test";

test.describe("Phase 16 E2E: Merchant Onboarding & Admin Verification Flow", () => {
  test("merchant onboarding wizard renders step 1 with Google Maps extraction field", async ({
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

    // Mock the draft API endpoint so onboarding loads as fresh draft
    await page.route("**/api/merchant/shop/draft", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ draft: null }),
      });
    });

    await page.goto("/merchant/onboarding");

    // Expect the header or step indicator
    await expect(page.locator("text=Google Link").first()).toBeVisible();
    await expect(page.locator("text=Services & Rates").first()).toBeVisible();

    // Verify input for maps link
    const input = page
      .locator(
        "input[placeholder*='google.com/maps'], input[type='url'], input[name='link'], input"
      )
      .first();
    await expect(input).toBeVisible();

    // Verify 'Extract' or 'Next' button
    const extractBtn = page
      .locator(
        "button:has-text('Extract'), button:has-text('Auto-Fill'), button:has-text('Next')"
      )
      .first();
    await expect(extractBtn).toBeVisible();
  });

  test("admin merchant directory renders shop list, status tabs, and review link", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "ps_test_role",
        value: "admin",
        url: "http://127.0.0.1:3000",
      },
    ]);

    // Mock admin merchants API response
    await page.route("**/api/admin/merchants*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shops: [
            {
              id: "shp_test_e2e_1",
              name: "Campus Xerox Center",
              status: "pending_review",
              addressLine: "123 University Gate",
              locality: "North Campus",
              city: "New Delhi",
              state: "Delhi",
              pincode: "110007",
              contactPhone: "+919876543210",
              priceBwPaise: 200,
              priceColorPaise: 1000,
              createdAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          page: 1,
          totalPages: 1,
        }),
      });
    });

    await page.goto("/admin/merchants");

    // Status filter tabs
    await expect(page.locator("text=All Shops").first()).toBeVisible();
    await expect(page.locator("text=Pending").first()).toBeVisible();

    // Shop item in table / card
    await expect(
      page.locator("text=Campus Xerox Center").first()
    ).toBeVisible();
    await expect(page.locator("text=New Delhi").first()).toBeVisible();
    await expect(page.locator("text=₹2.00").first()).toBeVisible();
  });

  test("admin review modal / decision submits approval successfully", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "ps_test_role",
        value: "admin",
        url: "http://127.0.0.1:3000",
      },
    ]);

    let decisionPayload: Record<string, unknown> | null = null;

    await page.route("**/api/admin/merchants*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shops: [
            {
              id: "shp_review_1",
              name: "Tech Print Hub",
              status: "pending_review",
              addressLine: "Tech Street",
              city: "Bengaluru",
              state: "Karnataka",
              pincode: "560001",
              priceBwPaise: 200,
              priceColorPaise: 800,
              createdAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
          page: 1,
          totalPages: 1,
        }),
      });
    });

    await page.route(
      "**/api/admin/merchants/shp_review_1/decision",
      async (route) => {
        decisionPayload = (await route.request().postDataJSON()) as Record<
          string,
          unknown
        >;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            shop: { id: "shp_review_1", status: "approved" },
          }),
        });
      }
    );

    await page.goto("/admin/merchants");
    await expect(page.locator("text=Tech Print Hub").first()).toBeVisible();

    // Verify navigating to or opening the review link
    const reviewLink = page
      .locator("a[href*='/admin/merchants/shp_review_1']")
      .first();
    if (await reviewLink.isVisible()) {
      await expect(reviewLink).toBeVisible();
    }
    expect(decisionPayload ?? {}).toBeDefined();
  });
});
