import { Page, expect } from "@playwright/test"
import AuthorizedMainPage from "../basePages/authorizedMainPage";
import RecruitsPanel from "../../panels/recruitsPanel";
import TalentsTab from "../../tabs/talentsTab";

export default class RecruitPage extends AuthorizedMainPage{

    recruitsPanel: RecruitsPanel;
    talentsTab: TalentsTab;

    constructor(public page: Page) {
        super(page);
        this.recruitsPanel = new RecruitsPanel(page);
        this.talentsTab = new TalentsTab(page);
    }
}