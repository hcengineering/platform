package ui.web.containers.huly;

import helpers.verifications.Verification;
import org.openqa.selenium.By;
import ui.elements.Element;
import ui.web.IWebContext;
import ui.web.containers.BaseElementContainer;

public class LeftMenuPopUpRows extends BaseElementContainer {

    private final Element iconElement = new Element("Icon", this, By.tagName("use"));
    private final Element titleElement = new Element("Title", this, By.cssSelector("span.label"));
    private final Element tickElement = new Element("Tick", this, By.xpath(".//div[@class='ap-check']/*"));

    public LeftMenuPopUpRows(String title, IWebContext parent) {
        super(String.format("Row '%s'", title), parent,
                By.xpath(String.format(".//button[contains(@class, 'ap-menuItem') and ./span[text()='%s']]", title)));
    }

    public void uncheckIfChecked(){
        STEP(String.format("Uncheck %s", getName()));
        if(tickElement.visible()){
            tickElement.click();
        }
    }

    public void checkElementIfNeeded(){
        STEP(String.format("Check %s", getName()));
        if(tickElement.notVisible()){
            titleElement.click();
        }
    }

    public void verifyIsChecked(){
        STEP(String.format("Verify %s is checked", getName()));
        Verification.verifyTrue(tickElement.visible(), String.format("Verify %s is checked", getName()));
    }

    public void verifyIsNotChecked(){
        STEP(String.format("Verify %s is not checked", getName()));
        Verification.verifyTrue(tickElement.notVisible(), String.format("Verify %s is not checked", getName()));
    }
}
