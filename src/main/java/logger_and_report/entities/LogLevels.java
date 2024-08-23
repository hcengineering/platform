package logger_and_report.entities;

import lombok.Getter;
import org.apache.logging.log4j.Level;

import java.awt.*;

@Getter
public enum LogLevels {

    /**
     * STEP -- business logic level (e.g. "Login to the app")
     * ACTION -- element level (e.g. "Click 'Login Button'")
     * SUCCESS/FAIL/ERROR -- verification level
     * **/
    INFO(Level.INFO, Color.blue),
    FAIL(Level.forName("FAIL", 201), Color.yellow),
    FATAL(Level.FATAL, Color.red),
    SUCCESS(Level.forName("SUCCESS", 401), Color.green),
    STEP(Level.forName("STEP", 402), Color.black),
    ACTION(Level.forName("ACTION", 403), Color.gray),
    API(Level.forName("API", 404), Color.darkGray),
    SYSTEM(Level.forName("SYSTEM", 405), Color.black),
    UNDEFINED(Level.forName("UNDEFINED", 301), Color.PINK);

    private final Level level;
    private final Color color;

    LogLevels(Level level, Color color){
        this.level = level;
        this.color = color;
    }

}
