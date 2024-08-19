package selenium.huly_tests;

import helpers.Durations;
import management.sessions_and_browser.Sessions;
import org.testng.annotations.Test;
import ui.web.containers.huly.WorkspaceContainer;
import ui.web.pages.huly.LoginPage;
import ui.web.pages.huly.MainDashboard;

import static helpers.Durations.ONE_MINUTE;

public class LoginTest extends BaseHulyTest {

    @Test(testName = "Login with correct credentials", description = "Verify Login to Huly with valid credentials")
    public void loginTest() {
        LoginPage loginPage = new LoginPage(Sessions.getCurrentSession().getBrowserManager().getDriver());
        loginPage.waitAndVerifyPageIsOpened();

        WorkspaceContainer workspaceContainer = loginPage.loginWithPassword(email, password);
        workspaceContainer.waitForOpening(Durations.THIRTY_SECONDS);

        workspaceContainer.verifyUserEmail(email);

        MainDashboard mainDashboard = workspaceContainer.openDashboard(workspace);
        mainDashboard.waitAndVerifyPageIsOpened(ONE_MINUTE);

        generateTestFinalStatus();
    }
}
