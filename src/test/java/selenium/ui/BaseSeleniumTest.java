package selenium.ui;

import helpers.FileSystemHelper;
import logger_and_report.entities.SuiteInfo;
import logger_and_report.withlog4j2.TestLogger;
import management.environment.DefaultEnvironment;
import management.sessions_and_browser.BrowserManager;
import management.sessions_and_browser.Sessions;
import org.testng.ITestContext;
import org.testng.annotations.*;

import java.lang.reflect.Method;

public class BaseSeleniumTest {

    protected static SuiteInfo suiteInfo;

    /** in TestNG7.9.0 Native Injections for BeforeSuite became disabled
     * **/
    @BeforeSuite(alwaysRun = true)
    public synchronized void beforeSuite(ITestContext context) {
        suiteInfo = SuiteInfo.initSuite(context);
        FileSystemHelper.initLoggerDirectoryIfNeeded();//todo maybe add it before each screenshot making
    }

    @BeforeMethod
    protected void launch(ITestContext context, Method method, Object[] params){
        Test annotation = method.getAnnotation(Test.class);

        Sessions.createSession(annotation);
        getBrowserManager().navigate(DefaultEnvironment.get().getAppUrl());
        getLogger().getTestInfo().makeReportRowsActive();
    }

    @AfterMethod(alwaysRun = true)
    public void afterMethod(ITestContext context, Method method, Object[] params) {
        if(getLogger().getTestInfo().getTestStatus() == null)
            getLogger().generateFailTestStatus(getBrowserManager().makeScreenshot());
        getLogger().getTestInfo().makeAfterTestRowsActive();
        suiteInfo.addTestInfo(getLogger().getTestInfo());
        Sessions.killCurrentSession();
    }

    protected TestLogger getLogger() {
        return Sessions.getCurrentSession().getLoggerSession();
    }

    protected BrowserManager getBrowserManager() {
        return Sessions.getCurrentSession().getBrowserManager();
    }

    @AfterSuite(alwaysRun = true)
    protected void closeAllSession() {
        Sessions.killAllSessions();
        suiteInfo.setEndDateTimeAndDuration();
        suiteInfo.setCountOfThreads(Sessions.getCountOfUniqueSessions());
        FileSystemHelper.upsertSuiteInfoFile(suiteInfo);

        System.out.println(suiteInfo.toString());
    }

    //only as last step for any testMethod
    protected void generateTestFinalStatus(){
        getLogger().generateTestStatus(getBrowserManager().makeScreenshot());
    }

}
