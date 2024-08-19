package logger_and_report.withlog4j2;

import logger_and_report.entities.*;
import helpers.FileSystemHelper;
import lombok.Getter;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.annotations.Test;
import org.apache.logging.log4j.core.LogEvent;

import java.io.File;

public class TestLogger {

    @Getter
    private TestInfo testInfo;
    private static Logger logger;

    public TestLogger(Test annotation){
        testInfo = new TestInfo(annotation);
        logger = LogManager.getLogger(CustomUIAppender.class);
        SuitesFilesManagement.updateSuitesFiles();
    }


    public void addRow(LogEvent event) {
        Object[] parameters = event.getMessage().getParameters();
        File screenshot = null;
        if (parameters != null && parameters.length > 0) {
            if (parameters[0] instanceof File screenshotData)
                screenshot = screenshotData;
            else if (parameters[0] instanceof byte[] screenshotData)
                screenshot = FileSystemHelper.createScreenshotFile(screenshotData);
            else
                SYSTEM("Incorrect Logger Parameter '" + parameters[0] + "'");//should never happen
        }

        testInfo.addRow(ReportRow.createReportRow(event, screenshot));
    }

    public void log(LogLevels level, String info, File screenshot){
        /*logger.*/log(level.getLevel(), info, screenshot);
    }

    public void log(Level level, String info, File screenshot){
        logger.log(level, info, screenshot);
    }

    private void log(LogLevels level, String info){
        logger.log(level.getLevel(), info);
    }

    public void STEP(String info, File screenshot) {
        log(LogLevels.STEP, info, screenshot);
    }

    public void STEP(String info) {
        log(LogLevels.STEP, info);
    }

    public void ACTION(String info, File screenshot) {
        log(LogLevels.ACTION, info, screenshot);
    }

    public void ACTION(String info) {
        log(LogLevels.ACTION, info);
    }

    public void SUCCESS(String info, File screenshot) {
        log(LogLevels.SUCCESS, info, screenshot);
    }

    public void SUCCESS(String info) {
        log(LogLevels.SUCCESS, info);
    }

    public void FAIL(String info, File screenshot) {
        log(LogLevels.FAIL, info, screenshot);
    }

    public void FAIL(String info) {
        log(LogLevels.FAIL, info);
    }

    public void FATAL(String info, File screenshot) {
        log(LogLevels.FATAL, info, screenshot);
        throw new Error(info);
    }

    public void FATAL(String info) {
        log(LogLevels.FATAL, info);
        throw new Error(info);
    }

    public void SYSTEM(String info) {
        log(LogLevels.SYSTEM, info);
    }

    public void SYSTEM(String info, File screenshot) {
        log(LogLevels.SYSTEM, info, screenshot);
    }

    public void INFO(String info) {
        log(LogLevels.INFO, info);
    }

    public void INFO(String info, File screenshot) {
        log(LogLevels.INFO, info, screenshot);
    }

    public void UNDEFINED(String info) {
        log(LogLevels.UNDEFINED, info);
    }

    public void UNDEFINED(String info, File screenshot) {
        log(LogLevels.UNDEFINED, info, screenshot);
    }

    //use it only for last step in testMethod or as first row in afterMethod
    public void addTestFinalStatusToLogInLastStep(File screenshot){
        addTestFinalStatusToLog(screenshot, true);
    }

    public void generateTestStatus(File screenshot){
        addTestFinalStatusToLog(screenshot, true);
    }

    public void generateFailTestStatus(File screenshot){
        addTestFinalStatusToLog(screenshot, false);
    }

    //todo need to add this Row as separate Info to the UI report (as first maybe)
    private void addTestFinalStatusToLog(File screenshot, boolean isLastStep) {
        if(isLastStep)
            testInfo.setCaseFullyCompleted();
        TestStatus testStatus = testInfo.generateFinalTestStatus();
        String finalString = testInfo.getFinalStatusString();
        switch (testStatus) {
            case SUCCESS:
                SUCCESS(finalString, screenshot);
                break;
            case FAIL:
                 FAIL(finalString, screenshot);
                 if(isLastStep)
                     throw new AssertionError(finalString);
                 break;
            case FATAL:
                log(LogLevels.FATAL, finalString, screenshot);
                break;
            case SKIPPED:
                SYSTEM(finalString);
                break;
            case UNKNOWN:
                FATAL(finalString);
                break;
        }
    }

}
