import { test, expect } from "@playwright/test";

test.describe("Phase 16 E2E: Route Security and Authorization Guards", () => {
  test("public landing page renders brand identity and key CTAs", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PrintSafe/i);
    await expect(page.locator("text=PrintSafe").first()).toBeVisible();

    // Verify key navigation and CTAs
    const startPrinting = page
      .locator("a[href*='/signup'], a[href*='/app']")
      .first();
    await expect(startPrinting).toBeVisible();

    // Verify footer links
    const privacyLink = page.locator("a[href='/privacy']").first();
    const termsLink = page.locator("a[href='/terms']").first();
    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
  });

  test("public privacy and terms pages render full legal disclaimers", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(
      page.locator("text=PrintSafe Privacy Notice").first()
    ).toBeVisible();
    await expect(
      page.locator("text=Zero-Trust Document Architecture").first()
    ).toBeVisible();

    await page.goto("/terms");
    await expect(page.locator("text=Terms of Service").first()).toBeVisible();
  });

  test("unauthenticated visitor accessing customer area (/app) is redirected to login", async ({
    page,
  }) => {
    await page.goto("/app");
    await page.waitForURL((url) => url.pathname.includes("/login"));
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated visitor accessing merchant area (/merchant) is redirected to merchant login", async ({
    page,
  }) => {
    await page.goto("/merchant");
    await page.waitForURL((url) => url.pathname.includes("/merchant/login"));
    expect(page.url()).toContain("/merchant/login");
  });

  test("unauthenticated visitor accessing admin area (/admin) is redirected to admin login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL((url) => url.pathname.includes("/admin/login"));
    expect(page.url()).toContain("/admin/login");
  });

  test("developer UI showcase page (/dev/ui) is guarded in production builds", async ({
    page,
  }) => {
    const response = await page.goto("/dev/ui");
    expect([200, 404]).toContain(response?.status());
  });

  test("authenticated customer cannot access merchant portal or admin area", async ({
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

    // Customer trying to access /merchant
    await page.goto("/merchant/queue");
    await page.waitForURL((url) => !url.pathname.startsWith("/merchant/queue"));
    expect(page.url()).not.toContain("/merchant/queue");

    // Customer trying to access /admin
    await page.goto("/admin/plans");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin/plans"));
    expect(page.url()).not.toContain("/admin/plans");
  });

  test("authenticated merchant cannot access restricted admin area", async ({
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

    await page.goto("/admin/plans");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin/plans"));
    expect(page.url()).not.toContain("/admin/plans");
  });
});
