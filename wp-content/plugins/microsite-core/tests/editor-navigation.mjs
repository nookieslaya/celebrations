/** Shared navigation for existing regression scenarios after the gallery rollout. */
export async function chooseTemplate(page, type, name) {
  await page.getByLabel("What are you making?").selectOption(type);
  const card = page.locator(".template-card").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
  await card
    .getByRole("button", { name: "Use this template", exact: true })
    .click();
}

export async function goStep(page, step) {
  const labels = {
    about: "About the celebration",
    event: "Date & location",
    responses: "Guest responses",
    style: "Style",
    review: "Review & publish",
  };
  if (new URL(page.url()).searchParams.get("step") !== step) {
    await page
      .getByRole("button", {
        name: new RegExp(`^Step [0-9]+: ${labels[step]}$`),
      })
      .click();
  }
}
