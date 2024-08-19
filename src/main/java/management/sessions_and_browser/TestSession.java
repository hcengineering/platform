package management.sessions_and_browser;

import logger_and_report.withlog4j2.TestLogger;
import lombok.Getter;

import java.util.Locale;

public class TestSession {

    @Getter
    private BrowserManager browserManager;
    @Getter
    private TestLogger loggerSession;
    private long threadId;

    public TestSession(BrowserManager browserManager, TestLogger loggerSession, long threadId) {
        this.browserManager = browserManager;
        this.loggerSession = loggerSession;
        this.threadId = threadId;
        Locale.setDefault(Locale.ENGLISH);
    }

    public long getThreadId() {
        return threadId;
    }
}
