package ui.web.pages;

import lombok.Getter;
import management.environment.DefaultEnvironment;
import helpers.verifications.Verification;
import ui.web.containers.BaseElementContainer;
import ui.web.IWebContext;
import org.openqa.selenium.WebDriver;

import java.time.Duration;

public abstract class BasePage implements IWebContext {

    private static final Duration pageDuration = DefaultEnvironment.get().getPageTimeout();

    @Getter
    protected WebDriver driver;
    @Getter
    private String name;

    public BasePage(String name, WebDriver driver) {
        this.name = name;
        this.driver = driver;
    }

    public abstract boolean waitForOpening(Duration duration);

    public boolean waitForOpening(){
        return waitForOpening(pageDuration);
    }

    public void waitAndVerifyPageIsOpened(){
        Verification.verifyTrue(waitForOpening(), String.format("Verify if page %s is opened", name));
    }

    public void waitAndVerifyPageIsOpened(Duration duration){
        Verification.verifyTrue(waitForOpening(duration), String.format("Verify if page %s is opened", name));
    }

    public void refresh(){
        driver.navigate().refresh();
    }

    public BaseElementContainer getContainer(){
        return null;
    }

    public BasePage getPage(){
        return this;
    }

}
