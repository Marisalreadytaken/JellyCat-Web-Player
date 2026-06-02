import { expect, test } from "@playwright/test";

test("renders the login terminal", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "JELLYCAT" })).toBeVisible();
  await expect(page.getByPlaceholder("SERVER URL")).toBeVisible();
  await expect(page.getByPlaceholder("USERNAME")).toBeVisible();
  await expect(page.getByRole("button", { name: "CONNECT" })).toBeVisible();
});
