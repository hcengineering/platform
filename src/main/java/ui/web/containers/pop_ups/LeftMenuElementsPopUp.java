package ui.web.containers.pop_ups;

import org.openqa.selenium.By;
import ui.elements.Element;
import ui.web.IWebContext;
import ui.web.containers.huly.LeftMenuPopUpRows;

public class LeftMenuElementsPopUp extends BasePopUp{

    public static final String CONTACTS = "Contacts";
    public static final String CHAT = "Chat";
    public static final String HUMAN_RESOURCES = "Human resources";
    public static final String TRACKER = "Tracker";
    public static final String DOCUMENTS = "Document";
    public static final String PLANNER = "Planner";
    public static final String TEAM = "Team";
    public static final String OFFICE = "Office";
    public static final String DRIVE = "Drive";

    private final Element outsideElement = new Element("Outside Element", this, By.xpath(".//div[contains(@class, 'modal-overlay')]"));
    public LeftMenuElementsPopUp(IWebContext parent) {
        super("Left Menu Elements Pop Up", parent, By.cssSelector("div.popup.endShow"));
    }

    private LeftMenuPopUpRows createRow(String title) {
        return new LeftMenuPopUpRows(title, this);
    }

    public void uncheckRows(String... titles) {
        for (String title : titles) {
            createRow(title).uncheckIfChecked();
        }
    }

    public void checkRows(String... titles) {
        for (String title : titles) {
            createRow(title).checkElementIfNeeded();
        }
    }

    public void closeByTapOutside() {
        getPage().getDriver().findElement(By.xpath(".//div[contains(@class, 'modal-overlay')]")).click();
        waitForClose();
    }

}
