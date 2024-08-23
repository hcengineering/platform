package ui.web.containers;

import ui.web.IWebContext;
import ui.elements.Element;
import ui.web.pages.BasePage;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

import java.time.Duration;

public abstract class BaseElementContainer implements IWebContext {

    private static final Duration defaultConteinerDuration = Duration.ofSeconds(15);

    private Element element;
    private String name;
    private IWebContext parent;
    private By loc;

    public BaseElementContainer(String name, IWebContext parent, By loc){
        this.name = name;
        this.parent = parent;
        this.loc = loc;
        element = new Element(name, parent, loc);
    }

    @Override
    public boolean waitForOpening() {
        return waitForOpening(defaultConteinerDuration);
    }

    @Override
    public boolean waitForOpening(Duration timeout) {
        return element.waitForVisible(timeout);
    }

    @Override
    public void refresh() {
        getPage().refresh();
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public WebDriver getDriver() {
        return getPage().getDriver();
    }

    @Override
    public BasePage getPage() {
        return parent.getPage();
    }

    public BaseElementContainer getContainer(){
        return this;
    }

    public Element getContainerAsElement(){
        return element;
    }

    public boolean visible() {
        return getContainerAsElement().visible();
    }

    public boolean notVisible() {
        return getContainerAsElement().notVisible();
    }

}
