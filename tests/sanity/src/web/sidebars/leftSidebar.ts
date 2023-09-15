import { Page } from "@playwright/test"

export default class LeftSidebar {

    constructor(public page: Page) {

    }


    // Locators
    leftSideBarLogo = () => this.page.locator(".antiLogo");
    leftSideBarWorkspacePopUp = () => this.page.locator(".antiPopup");

    leftSideBarHideMenu = () => this.page.locator("#app-workbench\:string\:HideMenu");

    leftSideBarMessagesApplication = () => this.page.locator('[id="app-notification:string:Inbox"]');
    leftSideBarContactsApplication = () => this.page.locator('[id="app-contact:string:Contacts"]');
    leftSideBarChatsApplication = () => this.page.locator('[id="app-chunter:string:ApplicationLabelChunter"]');
    leftSideBarCalendarApplication = () => this.page.locator('[id="app-calendar:string:ApplicationLabelCalendar"]');
    leftSideBarRecruitApplication = () => this.page.locator('[id="app-recruit:string:RecruitApplication"]');
    leftSideBarLeadApplication = () => this.page.locator('[id="app-lead:string:LeadApplication"]');
    leftSideBarInventoryApplication = () => this.page.locator('[id="app-inventory:string:Inventory"]');
    leftSideBarHRApplication = () => this.page.locator('[id="app-hr:string:HRApplication"]');
    leftSideBarDocumentApplication = () => this.page.locator('[id="app-document:string:DocumentApplication"]');
    leftSideBarTrackerApplication = () => this.page.locator('[id="app-tracker:string:TrackerApplication"]');
    leftSideBarBoardApplication = () => this.page.locator('[id="app-board:string:BoardApplication"]');

    leftSideBarSettings = () => this.page.locator('[id="app-setting:string:Settings"]');
    leftSideBarProfileButton = () => this.page.locator('[id="profile-button"]');

    // Methods 
    async changeWorkspace(space: string): Promise<void> {
        this.leftSideBarLogo().click();
        this.leftSideBarWorkspacePopUp().locator('span', { hasText: space }).click();
    }

    async hideMenu(): Promise<void> {
        this.leftSideBarHideMenu().click();
    };

    async openMessagesApplication(): Promise<void> {
        this.leftSideBarMessagesApplication().click();
    };

    async openContactsApplication(): Promise<void> {
        this.leftSideBarContactsApplication().click();
    };

    async openChatsApplication(): Promise<void> {
        this.leftSideBarChatsApplication().click();
    };

    async openCalendarApplication(): Promise<void> {
        this.leftSideBarCalendarApplication().click();
    };

    async openRecruitApplication(): Promise<void> {
        this.leftSideBarRecruitApplication().click();
    };

    async openLeadApplication(): Promise<void> {
        this.leftSideBarLeadApplication().click();
    };

    async openLeadInventoryApplication(): Promise<void> {
        this.leftSideBarInventoryApplication().click();
    };

    async openHRApplication(): Promise<void> {
        this.leftSideBarHRApplication().click();
    };

    async openDocumentApplication(): Promise<void> {
        this.leftSideBarDocumentApplication().click();
    };

    async openTrackerApplication(): Promise<void> {
        this.leftSideBarTrackerApplication().click();
    };

    async openBoardApplication(): Promise<void> {
        this.leftSideBarBoardApplication().click();
    };
}