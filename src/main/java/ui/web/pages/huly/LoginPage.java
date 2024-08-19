package ui.web.pages.huly;

import helpers.verifications.Verification;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import ui.elements.Button;
import ui.elements.Input;
import ui.elements.Link;
import ui.web.containers.huly.WorkspaceContainer;
import ui.web.pages.BasePage;

import java.time.Duration;

public class LoginPage extends BasePage {

    private Input emailInput = new Input("Email", this, By.name("email"));
    private Input passwordInput = new Input("Password", this, By.name("current-password"));
    private Link loginWithPasswordLink = new Link("Login with password", this, By.xpath(".//a[contains(text(), 'Login with password')]"));
    private Button loginBtn = new Button("Login", this, By.xpath(".//button[./span[contains(text(), 'Log In')]]"));

    public LoginPage(WebDriver driver) {
        super("Login Page", driver);
    }

    @Override
    public boolean waitForOpening(Duration duration) {
        return emailInput.waitForVisible(duration);
    }

    public WorkspaceContainer loginWithPassword(String email, String password) {
        STEP("Login with email: " + email + " and password");
        clickLoginWithPassword();
        setCredentials(email, password);
        clickLogInBtn();
        return new WorkspaceContainer(this);
    }

    private void clickLoginWithPassword(){
        loginWithPasswordLink.click();
        Verification.verifyTrue(passwordInput.waitForVisible(), "Verify if password input is visible");
    }

    private void setCredentials(String email, String password){
        emailInput.setText(email);
        passwordInput.setText(password);
        Verification.verifyTrue(loginBtn.waitForEnabled(), "Verify if login button is enabled");
    }

    private void clickLogInBtn(){
        loginBtn.click();
    }

    public void selectWorkingArea(String area) {

    }
}
