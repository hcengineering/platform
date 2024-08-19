package management.sessions_and_browser;

import helpers.FileSystemHelper;
import io.github.bonigarcia.wdm.WebDriverManager;
import logger_and_report.withlog4j2.TestLogger;
import lombok.Getter;
import lombok.SneakyThrows;
import management.environment.DefaultEnvironment;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class BrowserManager {

    private ChromeOptions chromeOptions;
    @Getter
    private WebDriver driver;

    //todo need to re-implement for different Browsers
    @SneakyThrows
    private BrowserManager(ChromeOptions chromeOptions){
        this.chromeOptions = chromeOptions;
        this.driver = new ChromeDriver(chromeOptions);
        //this.driver = new RemoteWebDriver(new URL("http://localhost:4444/wd/hub"), chromeOptions);
        this.driver.manage().window().maximize();
        this.driver.manage().timeouts().pageLoadTimeout(DefaultEnvironment.get().getPageTimeout());
        //this.driver.manage().timeouts().implicitlyWait(DefaultEnvironment.get().getElementTimeout());
    }

    public static BrowserManager createNew(String browserName){
        WebDriverManager.chromedriver().setup();
        switch (browserName.toLowerCase()) {
            case "chrome":
                return new BrowserManager(createDefaultChromeOptions());
            default:
                throw new IllegalArgumentException("Unsupported browser: " + browserName);
        }
    }

    private static ChromeOptions createDefaultChromeOptions(){
        ChromeOptions options = new ChromeOptions();
        options.setExperimentalOption("excludeSwitches", Collections.singletonList("enable-automation"));
        //options.setExperimentalOption("enableVNC", true);
        options.setPageLoadStrategy(PageLoadStrategy.NORMAL);
        options.addArguments("start-maximized");
        options.addArguments("disable-infobars");
        options.addArguments("disable-popup-blocking");
        options.addArguments("--no-proxy-server");
        options.addArguments("--disable-web-security");
        options.addArguments("--password-store=basic");
        options.addArguments("−−lang=en-US");
        options.addArguments("--disable-translate");
        options.addArguments("--disable-search-engine-choice-screen");
        options.addArguments("disable-popup-blocking");
        options.addArguments("disable-infobars");
        options.addArguments("--disable-notifications");
        options.addArguments("ignore-certificate-errors");

        options.setCapability("selenoid:options", new HashMap<String, Object>() {{
            /* How to add test badge */
            put("name", "Test badge...");

            /* How to set session timeout */
            put("sessionTimeout", "15m");

            /* How to set timezone */
            put("env", new ArrayList<String>() {{
                add("TZ=UTC");
            }});

            /* How to add "trash" button */
            put("labels", new HashMap<String, Object>() {{
                put("manual", "true");
            }});

            /* How to enable video recording */
            put("enableVideo", true);
            put("enableVNC", true);
        }});
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("intl.accept_languages", "en");
        /* Disable 'Save password' */
        prefs.put("credentials_enable_service", false);
        prefs.put("profile.password_manager_enabled", false);
        options.setExperimentalOption("prefs", prefs);
        return options;
    }


    public synchronized void closeBrowser() {
        driver.close();
    }

    public synchronized void closeDriver() {
        driver.quit();
    }

    public File makeScreenshot(){
        return FileSystemHelper.createSeleniumScreenshotFile(((TakesScreenshot) getDriver()).getScreenshotAs(OutputType.BYTES));
    }

    public TestLogger getLogger() {
        return Sessions.getCurrentSession().getLoggerSession();
    }

    public void navigate(String appUrl) {
        getLogger().SYSTEM("Navigate to " + appUrl);
        driver.get(appUrl);
    }

}
