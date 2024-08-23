package logger_and_report.entities;

import lombok.Getter;
import lombok.Setter;
import org.apache.logging.log4j.core.LogEvent;

import java.io.File;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Setter
@Getter
public class ReportRow {

    private static final String INFO = "INFO";
    private static final String STEP = "STEP";
    private static final String ACTION = "ACTION";
    private static final String SUCCESS = "SUCCESS";
    private static final String FAIL = "FAIL";
    private static final String FATAL = "FATAL";
    private static final String SYSTEM = "SYSTEM";
    private static final String API = "API";
    private static final String UNDEFINED = "UNDEFINED";

    private LocalDateTime dateTime;
    private LogLevels logLevel;
    private String info;
    private String screenshotPath;

    private ReportRow(LogLevels infoType, String info, LocalDateTime dateTime, String screenshot){
        this.dateTime = dateTime;
        this.logLevel = infoType;
        this.info = info;
        this.screenshotPath = screenshot;
    }

    public static ReportRow createReportRow(LogEvent event, File screenshot){
        String info = event.getMessage().getFormattedMessage();
        Instant instant = Instant.ofEpochMilli(event.getTimeMillis());
        LocalDateTime dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
        var screenshotPath = screenshot == null ? null : screenshot.getPath();
        return new ReportRow(getLogLevel(event), info, dateTime, screenshotPath);
    }

    private static LogLevels getLogLevel(LogEvent event){
        return switch (event.getLevel().toString()) {
            case INFO -> LogLevels.INFO;
            case SYSTEM -> LogLevels.SYSTEM;
            case ACTION -> LogLevels.ACTION;
            case STEP -> LogLevels.STEP;
            case SUCCESS -> LogLevels.SUCCESS;
            case FAIL -> LogLevels.FAIL;
            case FATAL -> LogLevels.FATAL;
            case API -> LogLevels.API;
            default -> LogLevels.UNDEFINED;
        };
    }

    public String toString(){
        return dateTime + " " + logLevel + " " + info;
    }
}
