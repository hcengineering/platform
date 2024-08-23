package ui.web.containers.huly;

import helpers.verifications.MultipleVerification;
import helpers.verifications.Verification;
import org.openqa.selenium.By;
import ui.elements.Button;
import ui.elements.Element;
import ui.web.IWebContext;
import ui.web.containers.BaseElementContainer;

public class LeftMenu extends BaseElementContainer {

    private final Element workspaceLogoElement = new Element("Workspace Logo", this, By.cssSelector("div.logo-container"));
    private final Element showHideMenuElement = new Element("Show/Hide Menu", this, By.cssSelector("button.app.medium.svelte-dstakk"));
    private final Element inboxElement = new Element("Inbox", this, By.id("app-notification:string:Inbox"));
    private final Element plannerElement = new Element("Planner", this, By.id("app-time:string:Planner"));
    private final Element officeElement = new Element("Office", this, By.id("app-love:string:Office"));
    private final Element contactsElement = new Element("Contacts", this, By.id("app-contact:string:Contacts"));
    private final Element chatElement = new Element("Chat", this, By.id("app-chunter:string:ApplicationLabelChunter"));
    private final Element hrElement = new Element("HR", this, By.id("app-hr:string:HRApplication"));
    private final Element trackerElement = new Element("Tracker", this, By.id("app-tracker:string:TrackerApplication"));
    private final Element documentsElement = new Element("Documents", this, By.id("app-document:string:DocumentApplication"));
    private final Element teamElement = new Element("Team", this, By.id("app-time:string:Team"));
    private final Element driveElement = new Element("Drive", this, By.id("app-drive:string:Drive"));
    private final Element settingsElement = new Element("Settings", this, By.id("app-setting:string:Settings"));
    private final Element contactUsElement = new Element("Contact Us", this, By.id("app-support:string:ContactUs"));
    private final Button profileButton = new Button("Profile Button", this, By.id("profile-button"));

    public LeftMenu(IWebContext parent) {
        super("Left Menu", parent, By.cssSelector("div.antiPanel-application.vertical"));
    }

    private void verifyElementExists(Element element) {
        Verification.verifyTrue(element.visible(), String.format("Verify if element %s is visible", element.getLogicalName()));
    }

    private void verifyElementNotExists(Element element) {
        Verification.verifyTrue(element.visible(), String.format("Verify if element %s is not visible", element.getLogicalName()));
    }

    public void verifyAllElements() {
        MultipleVerification verification = new MultipleVerification("Verify Elements on Left Menu");
        verification.verifyElementsExist(workspaceLogoElement,
                showHideMenuElement,
                inboxElement,
                plannerElement,
                officeElement,
                contactsElement,
                chatElement,
                hrElement,
                trackerElement,
                documentsElement,
                teamElement,
                driveElement,
                contactUsElement,
                profileButton);
        verification.setResult();
    }

    public LeftMenuPopUpRows openSettingsPopUp() {
        settingsElement.click();
        return new LeftMenuPopUpRows("Settings", this);
    }

    private Element getElementByHoverTitle(String hover) {
        return new Element(hover, this, By.xpath(String.format(".//button[contains(@id, '%s')]", hover)));
    }

    public void verifyElementsExist(String... hovers) {
        MultipleVerification verification = new MultipleVerification("Verify Elements Exist on Left Menu");
        for (String title : hovers) {
            verification.verifyElementsExist(getElementByHoverTitle(title));
        }
        verification.setResult();
    }

    public void verifyElementsDoNotExist(String... titles) {
        MultipleVerification verification = new MultipleVerification("Verify Elements Do Not Exist on Left Menu");
        for (String title : titles) {
            verification.verifyElementsDoNotExist(getElementByHoverTitle(title));
        }
        verification.setResult();
    }
}
