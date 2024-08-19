package selenium.huly_tests.left_menu_tests;

import org.testng.annotations.Test;
import selenium.huly_tests.BaseHulyTest;
import ui.web.pages.huly.MainDashboard;

public class LeftMenuTest extends BaseHulyTest {

    @Test(testName = "Default Left Menu", description = "Verify All elements from left menu are visible by default")
    public void test() {
        MainDashboard mainDashboard = login();
        mainDashboard.waitAndVerifyPageIsOpened();

        mainDashboard.verifyAllElementsOnLeftMenu();

        generateTestFinalStatus();
    }
}
