package helpers.verifications;

import management.sessions_and_browser.Sessions;
import org.testng.Assert;
import ui.elements.Element;

import java.io.File;
import java.util.*;

public class MultipleVerification {

    private static final String SPLITTER = "\n";
    private Map<String, Boolean> results;
    private String message;

    public MultipleVerification(String message) {
        results = new HashMap<>();
        this.message = message + SPLITTER;
    }

    public void addResult(String message, boolean result) {
        results.put(message, result);
    }

    public void verifyElementExists(Element element) {
        addResult(String.format("Verify if element %s is visible", element.getLogicalName()), element.visible());
    }

    public void verifyElementNotExists(Element element) {
        addResult(String.format("Verify if element %s is visible", element.getLogicalName()), element.notVisible());
    }

    public void verifyElementsExist(Element... elements) {
        Arrays.stream(elements).forEach(this::verifyElementExists);
    }

    public void verifyElementsDoNotExist(Element... elements) {
        Arrays.stream(elements).forEach(this::verifyElementNotExists);
    }

    public void verifyValues(Object actual, Object expected, String message) {
        addResult(String.format("VERIFY: %s\nActual: %s\nExpected: %s", message, actual, expected), actual.equals(expected));
    }

    public void setResult(){
        List<String> successMessages = new ArrayList<>();
        List<String> errorMessages = new ArrayList<>();
        for(Map.Entry<String, Boolean> entry : results.entrySet()){
            if(entry.getValue())
                successMessages.add(entry.getKey());
            else
                errorMessages.add(entry.getKey());
        }

        verification(errorMessages, successMessages);
    }

    private void verification(List<String> errorMessages, List<String> successMessages) {
        try {
            Assert.assertTrue(errorMessages.isEmpty());
            Sessions.getCurrentSession().getLoggerSession().SUCCESS(message + String.join(SPLITTER, successMessages), makeScreenshot());
        } catch (AssertionError e) {
            Sessions.getCurrentSession().getLoggerSession().FAIL(message + String.join(SPLITTER, errorMessages), makeScreenshot());
            Sessions.getCurrentSession().getLoggerSession().SUCCESS(message + String.join(SPLITTER, successMessages));
        }
    }

    private static File makeScreenshot() {
        return Sessions.getCurrentSession().getBrowserManager().makeScreenshot();
    }
}
