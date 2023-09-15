import { Page } from "@playwright/test"
import BaseTab from "./baseTab";
import RecruitsPopUp from "../popUp/recruitsPopUp";

export default class TalentsTab extends BaseTab {

    recruitsPopUp: RecruitsPopUp;

    constructor(public page: Page) {
        super(page);
        this.recruitsPopUp = new RecruitsPopUp(page);
    }


    async openMenu(title: string): Promise<void> {
        let order = await this.findOrderRowByValue("title", title);
        (await this.findCellInRowByNumberAndColumnHeader(order, title)).click();
        await this.page.press('body', 'Meta+k');
    }
}