package management.rest_api;

import io.restassured.http.Cookies;
import management.rest_api.pojo.UserLoginPojo;

public class ApiSession {

    private static final String COOKIE_AWSALB = "AWSALB";
    private static final int TIMEOUT_IN_MILLIS = 300000;//5minutes

    private static ApiSession instance;
    private Cookies cookies;

    public static ApiSession getInstance(UserLoginPojo userLoginPojo, String uri) {
        if (instance == null) {
            instance = new ApiSession(userLoginPojo, uri);
        }
        return instance;
    }

    private ApiSession(UserLoginPojo userLoginPojo, String uri) {
        cookies = AuthenticateService.getAuthenticateCookies(userLoginPojo, uri);
    }

    public Cookies getCookies() {
        return cookies;
    }

    public void setCookies(Cookies cookies) {
        this.cookies = cookies;
    }
}
