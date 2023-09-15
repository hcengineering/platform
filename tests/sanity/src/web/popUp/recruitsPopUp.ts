import { Page } from "@playwright/test"

export default class RecruitsPopUp {

    constructor(public page: Page) {

    }


    // Locators
    popUp = () => this.page.locator(".selectPopup");
    placeholderInput = () => this.popUp().locator('[placeholder="type to filter..."]');
    newTalentButton = () => this.popUp().locator('.list-item', { hasText: 'New Talent' });
    closeButton = () => this.popUp().locator('[id="card-close"]');

    async enterValueInPlaceholder(value: string) : Promise<void>  {
        this.placeholderInput().fill(value);
    }

    async openAddNewTalentForm(): Promise<void> {
        await this.newTalentButton().click();
    }
    
    async closePopUp() : Promise<void> {
        await this.closeButton().click();
    }
}