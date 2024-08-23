package management.environment;

import helpers.FileSystemHelper;
import logger_and_report.entities.SuiteInfo;
import lombok.Getter;

@Getter
public class LoggerEnvironment extends BaseEnv {

    private static LoggerEnvironment env;
    private final boolean loggerIsEnabled;
    private final String loggerDirectory;
    private final String loggerScreenshotsDirectory;
    private final String loggerSuiteInfoDirectory;
    private final String loggerVideoDirectory;
    private final String loggerSuitesFileName;


    protected LoggerEnvironment() {
        super("/properties/logger.properties");
        loggerIsEnabled = Boolean.parseBoolean(getProperty("logger.enabling"));
        loggerDirectory = getProperty("logger.main_folder");
        loggerScreenshotsDirectory = getProperty("logger.screenshots_folder") + FileSystemHelper.SLASH + SuiteInfo.getInstance().getTitle();
        loggerSuiteInfoDirectory = getProperty("logger.suite_folder");
        loggerVideoDirectory = getProperty("logger.video_folder");
        loggerSuitesFileName = getProperty("logger.suites_file_name");
    }

    public static LoggerEnvironment get() {
        if(env == null)
            env = new LoggerEnvironment();
        return env;
    }
}
