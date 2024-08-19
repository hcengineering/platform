package ui.web.pages.huly;

import org.openqa.selenium.WebDriver;
import ui.web.containers.huly.LeftMenu;
import ui.web.containers.pop_ups.LeftMenuElementsPopUp;
import ui.web.pages.BasePage;

public abstract class BaseHulyPage extends BasePage {

    private final LeftMenu leftMenu = new LeftMenu(this);

    public BaseHulyPage(String name, WebDriver driver) {
        super(name, driver);
    }

    public void verifyAllElementsOnLeftMenu() {
        leftMenu.verifyAllElements();
    }

    public LeftMenuElementsPopUp openSettingsPopUp() {
        leftMenu.openSettingsPopUp();
        return new LeftMenuElementsPopUp( this);
    }

    public void verifyLeftMenuElementsExist(String...hovers) {
        leftMenu.verifyElementsExist(hovers);
    }

    public void verifyLeftMenuElementsDoNotExist(String...hovers) {
        leftMenu.verifyElementsDoNotExist(hovers);
    }
}
