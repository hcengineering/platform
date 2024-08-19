package selenium.huly_tests;

import management.environment.DefaultEnvironment;
import management.sessions_and_browser.Sessions;
import selenium.ui.BaseSeleniumTest;
import ui.web.containers.huly.WorkspaceContainer;
import ui.web.pages.huly.LoginPage;
import ui.web.pages.huly.MainDashboard;

public abstract class BaseHulyTest extends BaseSeleniumTest {
    protected String email = DefaultEnvironment.get().getEmail();
    protected String password = DefaultEnvironment.get().getPassword();
    protected String workspace = DefaultEnvironment.get().getWorkspace();


    protected MainDashboard login() {
        LoginPage loginPage = new LoginPage(Sessions.getCurrentSession().getBrowserManager().getDriver());
        loginPage.waitAndVerifyPageIsOpened();

        WorkspaceContainer workspaceContainer = loginPage.loginWithPassword(email, password);
        workspaceContainer.waitForOpening();

        MainDashboard mainDashboard = workspaceContainer.openDashboard(workspace);
        mainDashboard.waitAndVerifyPageIsOpened();
        return mainDashboard;
    }
}
