package selenium.api;

import management.rest_api.BaseRestAssuredConfig;
import org.testng.annotations.BeforeSuite;

public class BaseApiTest {

    @BeforeSuite
    public void initRestAssured(){
        BaseRestAssuredConfig.init();
    }
}
