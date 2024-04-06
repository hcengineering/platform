import { Page, Locator, expect } from '@playwright/test';

class TextToolbarPage {
    readonly page: Page;
    readonly heading1: Locator;
    readonly heading2: Locator;
    readonly heading3: Locator;
    readonly bold: Locator;
    readonly italics: Locator;
    readonly strikethrough: Locator;
    readonly underline: Locator;
    readonly hyperlink: Locator;
    readonly bulletsAndNumbering: Locator;
    readonly codeSnippets: Locator;
    readonly textToolbar: Locator;

    constructor(page: Page) {
        this.page = page;
        this.textToolbar = page.locator('.text-editor-toolbar');
        this.heading1 = this.textToolbar.locator('button').first();
        this.heading2 = this.textToolbar.locator('button:nth-child(2)');
        this.heading3 = this.textToolbar.locator('button:nth-child(3)');
        this.bold = this.textToolbar.locator('button:nth-child(5)');
        this.italics = this.textToolbar.locator('button:nth-child(6)');
        this.strikethrough = this.textToolbar.locator('button:nth-child(7)');
        this.underline = this.textToolbar.locator('button:nth-child(8)');
        this.hyperlink = this.textToolbar.locator('button:nth-child(10)');
        this.bulletsAndNumbering = this.textToolbar.locator('button:nth-child(12)');
        this.codeSnippets = this.textToolbar.locator('button:nth-child(17)');
    }

    async clickHeading1() {
        await this.heading1.click();
    }

    async clickHeading2() {
        await this.heading2.click();
    }

    async clickHeading3() {
        await this.heading3.click();
    }

    async clickBold() {
        await this.bold.click();
    }

    async clickItalics() {
        await this.italics.click();
    }

    async clickStrikethrough() {
        await this.strikethrough.click();
    }

    async clickUnderline() {
        await this.underline.click();
    }

    async insertHyperlink() {
        await this.hyperlink.click();
    }

    async useBulletsAndNumbering() {
        await this.bulletsAndNumbering.click();
    }

    async insertCodeSnippet() {
        await this.codeSnippets.click();
    }

    async toolbar() {
        this.textToolbar
    }
}

export { TextToolbarPage };
