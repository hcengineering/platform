package helpers.verifications;

import management.sessions_and_browser.Sessions;
import org.testng.Assert;

import java.io.File;

public class Verification {

    protected static void truthValidation(boolean condition, String message, boolean isFatal) {
        try {
            Assert.assertTrue(condition);
            Sessions.getCurrentSession().getLoggerSession().SUCCESS(message, makeScreenshot());
        } catch (AssertionError e) {
            if(isFatal)
                Sessions.getCurrentSession().getLoggerSession().FATAL(message, makeScreenshot());
            else
                Sessions.getCurrentSession().getLoggerSession().FAIL(message, makeScreenshot());
        }
    }

    protected static void equalsValidation(Object actual, Object expected, String message, boolean isFatal) {
        try {
            Assert.assertEquals(actual, expected, message);
            Sessions.getCurrentSession().getLoggerSession().SUCCESS(message, makeScreenshot());
        } catch (AssertionError e) {
            if(isFatal)
                Sessions.getCurrentSession().getLoggerSession().FATAL(message, makeScreenshot());
            else
                Sessions.getCurrentSession().getLoggerSession().FAIL(message, makeScreenshot());
        }
    }

    private static File makeScreenshot() {
        return Sessions.getCurrentSession().getBrowserManager().makeScreenshot();
    }

    public static void verifyTrue(boolean condition, String message) {
        String msg = "VERIFY: " + message;
        truthValidation(condition, msg, false);
    }

    public static void verifyEquals(Object actual, Object expected, String message) {
        String msg = String.format("VERIFY: %s\nActual: %s\nExpected: %s", message, actual, expected);
        equalsValidation(actual, expected, msg, false);
    }

    public static void assertTrue(boolean condition, String message) {
        String msg = "ASSERT: " + message;
        truthValidation(condition, msg, true);
    }

    public static void assertEquals(Object actual, Object expected, String message) {
        String msg = String.format("ASSERT: %s\nActual: %s\nExpected: %s",message, actual, expected);
        equalsValidation(actual, expected, msg, true);
    }

}


