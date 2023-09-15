import { Page, expect } from "@playwright/test"
import MainPage from "./mainPage";
import LeftSidebar from "../../sidebars/leftSidebar";

export default class AuthorizedMainPage extends MainPage{
    leftSidebar: LeftSidebar;

    constructor(public page: Page) {
        super(page);
        this.leftSidebar = new LeftSidebar(page);
    }
}