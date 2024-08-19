package ui.web.containers.huly;

import helpers.verifications.Verification;
import org.openqa.selenium.By;
import ui.elements.Element;
import ui.web.IWebContext;
import ui.web.containers.BaseElementContainer;
import ui.web.pages.huly.MainDashboard;

public class WorkspaceContainer extends BaseElementContainer {

    private final Element emailElement = new Element("Email", this, By.cssSelector("div.fs-title"));
    public WorkspaceContainer(IWebContext parent) {
        super("Workspace Container", parent, By.xpath(".//form[.//div[text()='Select workspace']]"));
    }

    public void verifyUserEmail(String email) {
        Verification.verifyEquals(emailElement.getText(), email, "User email verification");
    }

    public MainDashboard openDashboard(String workspace) {
        STEP("Open workspace: " + workspace);
        createWorkspaceElement(workspace).click();
        return new MainDashboard(getDriver());
    }

    private Element createWorkspaceElement(String workspace) {
        return new Element(String.format("Workspace '%s' Element", workspace), this, By.xpath(String.format(".//div[contains(@class, 'workspace ') and .//span[text()='%s']]", workspace)));
    }
}
