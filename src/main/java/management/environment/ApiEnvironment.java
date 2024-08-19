package management.environment;

public class ApiEnvironment extends BaseEnv {

    private static ApiEnvironment env;

    protected ApiEnvironment() {
        super("/properties/api.properties");
    }

    public static ApiEnvironment get() {
        if (env == null) {
            env = new ApiEnvironment();
        }
        return env;
    }

    public static String getURL() {
        return get().getProperty("url");
    }

    public static int getRequestTimeout() {
        return Integer.parseInt(get().getProperty("timeout_1_minute"));
    }
}
