import { test, expect } from '@playwright/test';
import { PlatformSetting, PlatformURI } from './utils'
import { TextToolbarPage } from './model/TextToolbarPage';
import path from 'path';

test.use({
  storageState: PlatformSetting
});


test.describe('Customize Ticket', () => {

    test.beforeEach(async ({ page }) => {
      await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/TSK-1`))?.finished()
    });

    test('Title Update', async ({ page }) => {
        await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/tracker/TSK-1`);

        // Check the existing title
        await expect(page.getByPlaceholder('Issue title')).toHaveValue('Issue in the In Progress status');

        // Edit the title and verify the new title
        await page.getByPlaceholder('Issue title').click();
        await page.getByPlaceholder('Issue title').fill('[Web App] State History Cleared After Page Refresh');
        await expect(page.getByPlaceholder('Issue title')).toHaveValue('[Web App] State History Cleared After Page Refresh');

        // Verifying that the title update activity is logged by name
        await page.getByRole('paragraph').first().click();
        await expect(page.locator('[id="activity\\:string\\:Activity"]')).toContainText('Title set to [Web App] State History Cleared After Page Refresh');
    });


  test('Validate description', async ({ page }) => {
    // Instantiate the TextToolbarPage with the current page
    const textToolbar = new TextToolbarPage(page);

    // Reusable locators not covered by the POM
    const firstParagraph = page.getByRole('paragraph').first();
    const descriptionField = page.locator('.tiptap').first();
    const mainDescription = page.getByRole('heading', { name: 'Description:' });
    const detailedDescriptionField = page.locator('div').filter({ hasText: /^Description:$/ }).nth(2);
    const stepsToReproduceText = page.getByText('Steps to reproduce:\n\n');
  
    // Click on the first paragraph
    await firstParagraph.click();
  
    // Fill in the description heading and select it to apply formatting
    await descriptionField.fill('Description:');
    await descriptionField.click({ clickCount: 3 });
    await expect(textToolbar.textToolbar).toBeVisible();
    await textToolbar.clickHeading2();
  
    // Update the main description heading
    await mainDescription.click();
  
    // Fill in the detailed description
    const detailedDescriptionText = 
        'Description:\n\nThe state history associated with bug tickets is unexpectedly erased after the relevant page is refreshed within the web application. This critical issue prevents tracking changes in ticket state, comments, and associated resolutions.\n\nSteps to reproduce:\n' +
        'Open a bug ticket within the web app.\n' +
        'Change ticket state from in progress to closed\n' +
        'Refresh the web page currently displaying the bug ticket.\n' +
        'View the ticket state history section.\n\n\n';
    await detailedDescriptionField.fill(detailedDescriptionText);
  
    // Select part of the text for styling
    await stepsToReproduceText.click({ clickCount: 3 });
    await expect(textToolbar.textToolbar).toBeVisible();
    await textToolbar.clickHeading3();
  
    // Example of combined actions not directly mapped via POM
    await page.getByText('View the ticket state history').click();

    for (let index = 0; index < 3; index++) {
      await page.getByText('Description:The state history').press('Shift+ArrowUp', {delay: 100}); 
    }
    await expect(textToolbar.textToolbar).toBeVisible();
    await textToolbar.useBulletsAndNumbering();
    

    // Simulating attachments for the ticket
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('.buttons-group > button').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, './files/Image-sample.png'));


    await expect(page.getByText('Image-sample.png 729.06kB • Download • Delete')).toBeVisible();
    await expect(page.locator('#ui-root')).toContainText('Image-sample.png');


    // Verifying description changed log
    await expect(page.locator('[id="activity\\:string\\:Activity"]')).toContainText('Appleseed John changed Description');

    // Verifying upload activity log
    await expect(page.getByText('Appleseed John changed description')).toBeVisible();

});
});


