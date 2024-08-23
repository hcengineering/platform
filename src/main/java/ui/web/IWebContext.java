package ui.web;

import helpers.FileSystemHelper;
import management.sessions_and_browser.Sessions;
import ui.web.containers.BaseElementContainer;
import ui.web.pages.BasePage;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

import java.io.File;
import java.time.Duration;

public interface IWebContext {

    boolean waitForOpening();

    boolean waitForOpening(Duration timeout);

    void refresh();

    String getName();

    WebDriver getDriver();

    BasePage getPage();

    BaseElementContainer getContainer();

    default void STEP(String info) {
        STEP(info, true);
    }

    default void STEP(String info, boolean withScreenshot) {
        if(withScreenshot)
            Sessions.getCurrentSession().getLoggerSession().STEP(info, makeDefaultScreenshot());
        else
            Sessions.getCurrentSession().getLoggerSession().STEP(info);
    }

    default void ACTION(String info) {
        ACTION(info, false);
    }

    default void ACTION(String info, boolean withScreenshot) {
        if(withScreenshot)
            Sessions.getCurrentSession().getLoggerSession().ACTION(info, makeDefaultScreenshot());
        else
            Sessions.getCurrentSession().getLoggerSession().ACTION(info);
    }

    default void FATAL(String info) {
        FATAL(info, true);
    }

    default void FATAL(String info, boolean withScreenshot) {
        if(withScreenshot)
            Sessions.getCurrentSession().getLoggerSession().FATAL(info, makeDefaultScreenshot());
        else
            Sessions.getCurrentSession().getLoggerSession().FATAL(info);
    }

    default void FAIL(String info, boolean withScreenshot) {
        if(withScreenshot)
            Sessions.getCurrentSession().getLoggerSession().FAIL(info, makeDefaultScreenshot());
        else
            Sessions.getCurrentSession().getLoggerSession().FAIL(info);
    }

    default void FAIL(String info) {
        FAIL(info, true);
    }


    default File makeDefaultScreenshot(){
        return FileSystemHelper.createSeleniumScreenshotFile(((TakesScreenshot) getDriver()).getScreenshotAs(OutputType.BYTES));
    }
}
