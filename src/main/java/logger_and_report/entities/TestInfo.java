package logger_and_report.entities;

import helpers.FileSystemHelper;
import lombok.Getter;
import lombok.Setter;
import org.testng.annotations.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Setter
@Getter
public class TestInfo {
    private static final String PASSED_TEST_PATTERN = "Test is completed SUCCESSFULLY";
    private static final String FAILED_TEST_PATTERN = "Test is completed with %s UNCRITICAL error(s):\n%s";
    private static final String FATAL_TEST_PATTERN = "Test is completed with %s FATAL error(s):\n%s\n and contains %s UNCRITICAL errors:\n%s";
    private static final String NO_VALIDATIONS_IN_TEST = "Test doesn't contains any validation steps";
    private static final String TEST_WAS_SKIPPED = "Test was skipped";

    private String title;//the same as json-file name
    private String description;
    private String comment;
    private String bug;
    private String id;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private List<ReportRow> testRows = new ArrayList<>();
    private List<ReportRow> beforeTestRows = new ArrayList<>();
    private List<ReportRow> afterTestRows = new ArrayList<>();
    private List<ReportRow> activeRows;
    private TestStatus testStatus;
    private boolean isCaseFullyCompleted = false;//true if test has reached the end of case
    private Test testAnnotation;
    private String finalStatusString;
    private String screenshotFolder;

    public TestInfo(Test testAnnotation){
        this.testAnnotation = testAnnotation;
        title = testAnnotation.testName();
        description = testAnnotation.description();
        startDateTime = LocalDateTime.now();
        screenshotFolder = FileSystemHelper.createScreenshotFolderPath(title);
        makeBeforeTestRowsActive();
    }

    private void makeListActive(List<ReportRow> rows) {
        if (rows == testRows)
            activeRows = testRows;
        else if (rows == beforeTestRows)
            activeRows = beforeTestRows;
        else if (rows == afterTestRows)
            activeRows = afterTestRows;
        else
            throw new IllegalArgumentException("Invalid list specified");
    }

    public void makeReportRowsActive(){
        makeListActive(testRows);
    }

    public void makeAfterTestRowsActive(){
        makeListActive(afterTestRows);
    }

    public void makeBeforeTestRowsActive(){
        makeListActive(beforeTestRows);
    }

    public void addRow(ReportRow row){
        if (activeRows != null) {
            activeRows.add(row);
        } else {
            throw new IllegalStateException("No active list set");
        }
    }

    public void setEndDateTime(){
        endDateTime = LocalDateTime.now();
    }


    public String getAllReportRows(){
        return testRows.stream().map(ReportRow::toString).collect(Collectors.joining("\n"));
    }

    public String getRowsAsString(LogLevels level){
        return testRows.stream()
                .filter(row -> row.getLogLevel().equals(level))
                .map(ReportRow::getInfo)
                .collect(Collectors.joining("\n"));
    }

    private List<ReportRow> getAllFatalRows(){
        return testRows.stream().filter(row -> row.getLogLevel().equals(LogLevels.FATAL)).toList();
    }

    private List<ReportRow> getAllFailedRows(){
        return testRows.stream().filter(row -> row.getLogLevel().equals(LogLevels.FAIL)).toList();
    }

    public int getCountOfFatalRows(){
        return getAllFatalRows().size();//never should be more than 1
    }

    public int getCountOfFailedRows(){
        return getAllFailedRows().size();
    }

    public boolean testHasFatalRows(){
        return !getAllFatalRows().isEmpty();
    }

    public boolean testHasFailedRows(){
        return !getAllFailedRows().isEmpty();
    }

    public boolean testHasSuccessRows(){
        return testRows.stream().anyMatch(row -> row.getLogLevel().equals(LogLevels.SUCCESS));
    }

    public void setCaseFullyCompleted(){
        isCaseFullyCompleted = true;
    }

    private void setTestStatus(TestStatus testStatus){
        this.testStatus = testStatus;
    }

    public void setFailTestStatus(){
        setTestStatus(TestStatus.FAIL);
    }

    public void setSuccessTestStatus(){
        setTestStatus(TestStatus.SUCCESS);
    }

    public void setFatalTestStatus(){
        setTestStatus(TestStatus.FATAL);
    }

    public void setSkippedTestStatus(){
        setTestStatus(TestStatus.SKIPPED);
    }

    private void generateFatalStatusString(){
        finalStatusString = String.format(FATAL_TEST_PATTERN, getCountOfFatalRows(), getRowsAsString(LogLevels.FATAL),
                getCountOfFailedRows(), getRowsAsString(LogLevels.FAIL));
    }

    private void generateFailedStatusString(){
        finalStatusString = String.format(FAILED_TEST_PATTERN, getCountOfFailedRows(), getRowsAsString(LogLevels.FAIL));
    }

    private void generateSuccessStatusString(){
        finalStatusString = PASSED_TEST_PATTERN;
    }

    private void generateSkippedStatusString(){
        finalStatusString = TEST_WAS_SKIPPED;
    }

    private void generateNoValidationsStatusString(){
        finalStatusString = NO_VALIDATIONS_IN_TEST;
    }


    //use it only in the end of test
    public TestStatus generateFinalTestStatus(){
        if (testHasFatalRows()) {
            generateFatalStatusString();
            setTestStatus(TestStatus.FATAL);
        }
        else if (testHasFailedRows()) {
            generateFailedStatusString();
            setTestStatus(TestStatus.FAIL);
        }
        else if (testHasSuccessRows()) {
            generateSuccessStatusString();
            setTestStatus(TestStatus.SUCCESS);
        }
        else if (!getTestRows().isEmpty()) {
            generateNoValidationsStatusString();
            setTestStatus(TestStatus.UNKNOWN);
        }
        else {
            generateSkippedStatusString();
            setTestStatus(TestStatus.SKIPPED);
        }

        return testStatus;
    }

}
