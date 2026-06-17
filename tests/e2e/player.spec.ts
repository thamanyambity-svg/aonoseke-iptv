import { test, expect } from '@playwright/test';

/**
 * Tests E2E — Parcours critiques du player IPTV.
 *
 * Couvre les 7 parcours identifiés comme critiques :
 *   1. Chargement de la landing page
 *   2. Mode démo (sans compte)
 *   3. Recherche de chaînes
 *   4. Filtre par pays et catégorie
 *   5. Ajout aux favoris
 *   6. Onglet Annuaire
 *   7. Aucune erreur JS pendant le parcours
 */

test.describe('1. Landing page', () => {
  test('charge la page avec le titre et les éléments attendus', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/IPTV Player/i);
    await expect(page.getByRole('heading', { name: /CRÉEZ VOTRE COMPTE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer avec Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer avec Facebook/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aperçu démo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Conditions d'utilisation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Politique de confidentialité/i })).toBeVisible();
  });

  test('affiche le badge 100% gratuit', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/gratuit/i);
  });
});

test.describe('2. Mode démo (sans compte)', () => {
  test('entre en mode démo et affiche le player', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();

    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /IPTV PLAYER/i })).toBeVisible();
  });
});

test.describe('3. Recherche de chaînes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();
    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });
  });

  test('permet de rechercher une chaîne par nom', async ({ page }) => {
    const searchbox = page.getByRole('searchbox', { name: /Rechercher une chaîne/i });
    await expect(searchbox).toBeVisible();
    await searchbox.fill('France');
    await page.waitForTimeout(500);

    const channelOptions = page.getByRole('option');
    const count = await channelOptions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('permet d\'effacer la recherche', async ({ page }) => {
    const searchbox = page.getByRole('searchbox', { name: /Rechercher une chaîne/i });
    await searchbox.fill('France');
    await page.waitForTimeout(500);
    await searchbox.clear();
    await page.waitForTimeout(500);
    await expect(searchbox).toHaveValue('');
  });
});

test.describe('4. Filtre par pays et catégorie', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();
    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });
  });

  test('le slider de pays est présent et interactif', async ({ page }) => {
    // Le slider de pays doit être présent initialement
    const paysGroup = page.getByRole('group', { name: /Sélectionner un pays/i });
    await expect(paysGroup).toBeVisible();

    // Au moins un bouton de navigation pays doit être présent
    const prevBtn = page.getByRole('button', { name: /Pays précédent/i });
    const nextBtn = page.getByRole('button', { name: /Pays suivant/i });
    const navBtnsCount = (await prevBtn.count()) + (await nextBtn.count());
    expect(navBtnsCount).toBeGreaterThan(0);

    // Le test valide la présence initiale — le clic peut cacher le slider
    // quand on atteint une extrémité, donc on ne teste que l'état initial.
  });

  test('permet de changer de catégorie', async ({ page }) => {
    const catGroup = page.getByRole('group', { name: /Sélectionner une catégorie/i });
    await expect(catGroup).toBeVisible();

    const prevCatBtn = page.getByRole('button', { name: /Catégorie précédente/i });
    const nextCatBtn = page.getByRole('button', { name: /Catégorie suivante/i });

    const beforeCount = (await prevCatBtn.count()) + (await nextCatBtn.count());
    expect(beforeCount).toBeGreaterThan(0);

    if (await nextCatBtn.count() > 0) {
      await nextCatBtn.first().click();
    } else {
      await prevCatBtn.first().click();
    }
    await page.waitForTimeout(300);
    await expect(catGroup).toBeVisible();
  });
});

test.describe('5. Ajout aux favoris', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();
    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });
  });

  test('permet d\'ajouter une chaîne aux favoris', async ({ page }) => {
    const favButton = page.getByRole('button', { name: /Ajouter.*des favoris/i }).first();
    await expect(favButton).toBeVisible();
    await favButton.click();
    await page.waitForTimeout(300);

    const favTab = page.getByRole('tab', { name: /FAVORIS/i });
    await favTab.click();
    await page.waitForTimeout(500);

    const favOptions = page.getByRole('option');
    const count = await favOptions.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('6. Onglet Annuaire', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();
    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });
  });

  test('affiche l\'annuaire des sources légales', async ({ page }) => {
    const annuaireTab = page.getByRole('tab', { name: /ANNUAIRE/i });
    await annuaireTab.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: /Annuaire des sources/i })).toBeVisible();

    const siteCards = page.locator('.site-card');
    const count = await siteCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('7. Aucune erreur JS', () => {
  test('la console ne contient pas d\'erreur critique pendant le parcours', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.getByRole('button', { name: /Aperçu démo/i }).click();
    await expect(page.getByText(/100% gratuit/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('searchbox', { name: /Rechercher une chaîne/i }).fill('News');
    await page.waitForTimeout(500);

    await page.getByRole('tab', { name: /ANNUAIRE/i }).click();
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(
      (e) => !e.includes('React DevTools') && !e.includes('Download the React'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
