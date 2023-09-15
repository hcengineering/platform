import { Page } from "@playwright/test"

export default class RecruitsPanel {

    constructor(public page: Page) {

    }


    // Locators
    newTalantButton = () => this.page.locator(".antiNav-subheader");

    myApplications = () => this.page.locator("span", { hasText: "My applications" });
    reviews = () => this.page.locator("span", { hasText: "Reviews" });
    vacancies = () => this.page.locator("span", { hasText: "Vacancies" });
    companies = () => this.page.locator("span", { hasText: "Companies" });
    applications = () => this.page.locator("span", { hasText: "Applications" });
    talents = () => this.page.locator("span", { hasText: "Talents" });

    skills = () => this.page.locator("span", { hasText: "Skills" });

    async addNewTalant(): Promise<void> {
        await this.newTalantButton().click();
        // TODO: Add talant window
    }

    async openMyApplicationTab(): Promise<void> {
        await this.myApplications().click();
    }

    async openReviewsTab(): Promise<void> {
        await this.reviews().click();
    }

    async openVacanciesTab(): Promise<void> {
        await this.vacancies().click();
    }

    async openCompaniesTab(): Promise<void> {
        await this.companies().click();
    }

    async openApplicationsTab(): Promise<void> {
        await this.applications().click();
    }

    async openTalentsTab(): Promise<void> {
        await this.talents().click();
    }

    async openSkillsTab(): Promise<void> {
        await this.skills().click();
    }
}