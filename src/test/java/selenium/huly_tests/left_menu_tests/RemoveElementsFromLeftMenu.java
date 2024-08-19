package selenium.huly_tests.left_menu_tests;

import org.testng.annotations.Test;
import selenium.huly_tests.BaseHulyTest;
import ui.web.containers.pop_ups.LeftMenuElementsPopUp;
import ui.web.pages.huly.MainDashboard;

public class RemoveElementsFromLeftMenu extends BaseHulyTest {

    @Test(testName = "Remove/Add elements from Left Menu", description = "Verify adding and removing elements from Left Menu")
    public void test() {
        MainDashboard mainDashboard = login();
        mainDashboard.waitAndVerifyPageIsOpened();

        LeftMenuElementsPopUp leftMenuElementsPopUp = mainDashboard.openSettingsPopUp();
        leftMenuElementsPopUp.waitForOpening();

        leftMenuElementsPopUp.uncheckRows(LeftMenuElementsPopUp.CONTACTS,
                LeftMenuElementsPopUp.CHAT,
                LeftMenuElementsPopUp.HUMAN_RESOURCES,
                LeftMenuElementsPopUp.TRACKER);

        leftMenuElementsPopUp.closeByTapOutside();

        mainDashboard.verifyLeftMenuElementsExist(LeftMenuElementsPopUp.DOCUMENTS,
                LeftMenuElementsPopUp.PLANNER,
                LeftMenuElementsPopUp.TEAM,
                LeftMenuElementsPopUp.OFFICE,
                LeftMenuElementsPopUp.DRIVE);

        mainDashboard.verifyLeftMenuElementsDoNotExist(LeftMenuElementsPopUp.CONTACTS,
                LeftMenuElementsPopUp.CHAT,
                LeftMenuElementsPopUp.HUMAN_RESOURCES,
                LeftMenuElementsPopUp.TRACKER);

        leftMenuElementsPopUp = mainDashboard.openSettingsPopUp();
        leftMenuElementsPopUp.waitForOpening();

        leftMenuElementsPopUp.checkRows(LeftMenuElementsPopUp.CONTACTS,
                LeftMenuElementsPopUp.CHAT,
                LeftMenuElementsPopUp.HUMAN_RESOURCES,
                LeftMenuElementsPopUp.TRACKER);

        leftMenuElementsPopUp.closeByTapOutside();

        mainDashboard.verifyAllElementsOnLeftMenu();

        generateTestFinalStatus();
    }
}
