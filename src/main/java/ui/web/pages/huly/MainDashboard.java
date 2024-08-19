package ui.web.pages.huly;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import ui.elements.Element;
import java.time.Duration;

public class MainDashboard extends BaseHulyPage {

    private final Element trackerTitle = new Element("Tracker Title", this, By.xpath(".//span[contains(text(), 'Tracker')]"));
    public MainDashboard(WebDriver driver) {
        super("Main Dashboard", driver);
    }

    @Override
    public boolean waitForOpening(Duration duration) {
        return trackerTitle.waitForVisible(duration);
    }


}
