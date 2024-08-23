package helpers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import logger_and_report.entities.SuiteInfo;
import management.environment.LoggerEnvironment;
import management.sessions_and_browser.Sessions;
import org.apache.commons.lang3.NotImplementedException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class FileSystemHelper {

    public static final String SCREENSHOT = "screenshot_";
    public static final String SUITE_INFO = "suite_info_";
    public static final String SLASH = "/";
    public static final String PNG = ".png";
    public static final String JSON = ".json";
    public static boolean isLoggerDirectoriesExisted = false;

    public static ObjectMapper mapper = new ObjectMapper();

    static {
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        initLoggerDirectoryIfNeeded();
    }

    public static File createScreenshotFile(byte[] screenshot) {

        String path = createUniqueScreenshotFilePath();

        File screenshotFile = new File(path);
        try {
            Files.write(screenshotFile.toPath(), screenshot);
            return screenshotFile;
        } catch (java.io.IOException e) {
            throw new NotImplementedException("Problem with file '" + path + "' creation.");
        }
    }

    private static String createUniqueScreenshotFilePath(){
        long timeStamp = System.currentTimeMillis();
        String fileName = SCREENSHOT + timeStamp + PNG;
        return Sessions.getCurrentSession().getLoggerSession().getTestInfo().getScreenshotFolder() + SLASH + fileName;
    }

    private static String createSeleniumUniqueScreenshotFilePath(){
        long timeStamp = System.currentTimeMillis();
        String fileName = SCREENSHOT + timeStamp + PNG;
        return Sessions.getCurrentSession().getLoggerSession().getTestInfo().getScreenshotFolder() + SLASH + fileName;
    }

    public static File createSeleniumScreenshotFile(byte[] screenshot) {

        String path = createSeleniumUniqueScreenshotFilePath();

        File screenshotFile = new File(path);
        try {
            Files.write(screenshotFile.toPath(), screenshot);
            return screenshotFile;
        } catch (java.io.IOException e) {
            throw new NotImplementedException("Problem with file '" + path + "' creation.");
        }
    }

    public static void upsertSuiteInfoFile(SuiteInfo suiteInfo)  {
        try {
            var json = mapper.writeValueAsBytes(suiteInfo);
            var path = createUniqueSuiteFilePath(suiteInfo);
            Files.write(path, json);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private static Path createUniqueSuiteFilePath(SuiteInfo suiteInfo){
        String fileName = suiteInfo.getTitle();
        return Path.of(LoggerEnvironment.get().getLoggerSuiteInfoDirectory() + SLASH + fileName);
    }

    public static void createDirectoryIfNeeded(String path){
        File directory = new File(path);
        if (!directory.exists()) {
            if (!directory.mkdirs())
                Sessions.getCurrentSession().getLoggerSession().FATAL("Failed to create directory '" + path + "'.");
        }
    }

    public static void initLoggerDirectoryIfNeeded() {
        if(!isLoggerDirectoriesExisted) {
            createDirectoryIfNeeded(LoggerEnvironment.get().getLoggerDirectory());
            createDirectoryIfNeeded(LoggerEnvironment.get().getLoggerScreenshotsDirectory());
            createDirectoryIfNeeded(LoggerEnvironment.get().getLoggerSuiteInfoDirectory());
        }
        isLoggerDirectoriesExisted = true;
    }

    public static String createScreenshotFolderPath(String fileName) {
        String path = LoggerEnvironment.get().getLoggerScreenshotsDirectory() + SLASH + fileName;
        String uniquePath = FileSystemHelper.createUniqueFolderPathWithPostfix(path);
        createDirectoryIfNeeded(uniquePath);
        return uniquePath;
    }

    private static String createUniqueFolderPathWithPostfix(String path) {
        String newFolderPath = path;
        String postfixPattern = " (%d)";
        File newFolder = new File(newFolderPath);;
        int index = 1;
        while(newFolder.exists()) {
            newFolderPath = path + String.format(postfixPattern, index);
            newFolder = new File(newFolderPath);
            index++;
        };
        return newFolderPath;
    }
}
