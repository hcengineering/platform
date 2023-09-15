import { Locator, Page } from "@playwright/test"

export default class BaseTab {

    constructor(public page: Page) {

    }

    // Locators
    table = () => this.page.locator(".antiTable");
    tableBody = () => this.table().locator('tbody');
    tableRows = () => this.tableBody().locator('tr');
    thead = () => this.table().locator("thead");
    theadElements = () => this.thead().locator("th");

    async findAllRowsInTable(): Promise<Locator> {
        return this.tableBody().locator('tr');
    }

    async findCountRowsInTable(): Promise<number> {
        return this.tableBody().locator('tr').count();
    }

    async findRowByOrder(order: number): Promise<Locator> {
        return this.tableBody().locator('tr').nth(order);
    }

    async findValueInRowByNumberAndColumnHeader(order: number, columnHeader: string): Promise<String> {
        let cellElement = await this.findCellInRowByNumberAndColumnHeader(order, columnHeader);
        return await cellElement.innerText();
    }

    async findCellInRowByNumberAndColumnHeader(order: number, columnHeader: string): Promise<Locator> {
        let orderCell;

        for (let i = 0; i < await this.theadElements().count(); i++) {
            if ((await this.theadElements().nth(i).innerText()).toLowerCase() === columnHeader.toLowerCase()) {
                orderCell = i;
                break;
            }
        }
        return this.tableRows().nth(order - 1).locator("td").nth(orderCell);
    }

    async findOrderRowByValue(columnHeader: string, value: string): Promise<number> {
        let orderCell;
        let orderRow;

        for (let i = 0; i < await this.theadElements().count(); i++) {
            if ((await this.theadElements().nth(i).innerText()).toLowerCase() === columnHeader.toLowerCase()) {
                orderCell = i;
                break;
            }
        }

        for (let i = 0; i < await this.tableRows().count(); i++) {
            if (await this.tableRows().nth(i).locator('td').nth(orderCell).innerText() === value) {
                orderRow = i;
                break;
            }
        }
        return orderRow;
    }
}