package management.environment;

import java.time.Duration;
import java.util.Locale;

public class DefaultEnvironment extends BaseEnv {

    private static DefaultEnvironment env;

    protected DefaultEnvironment() {
        super("/properties/default.properties");
    }

    public static DefaultEnvironment get() {
        if(env == null)
            env = new DefaultEnvironment();
        return env;
    }

    public String getAppUrl() {
        return getProperty("url");
    }

    public String getBrowserName() {
        return getProperty("browser");
    }

    public Duration getPageTimeout() {
        return Duration.ofSeconds(Integer.parseInt(getProperty("timeouts.page")));
    }

    public Duration getPopUpTimeout() {
        return Duration.ofSeconds(Integer.parseInt(getProperty("timeouts.popUp")));
    }


    public Duration getElementTimeout() {
        return Duration.ofSeconds(Integer.parseInt(getProperty("timeouts.element")));
    }

    public String getOS(){
        return System.getProperty("os.name");
    }

    public boolean isMac(){
        return getOS().toLowerCase(Locale.ROOT).contains("mac");
    }

    public boolean withVideo(){
        return Boolean.parseBoolean(getProperty("video.recording"));
    }

    public String getEmail(){
        return getProperty("email");
    }

    public String getPassword(){
        return getProperty("password");
    }

    public String getWorkspace(){
        return getProperty("workspace");
    }

}
