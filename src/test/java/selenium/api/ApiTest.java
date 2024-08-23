package selenium.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import io.restassured.response.Response;
import management.rest_api.BaseRestAssuredConfig;
import management.rest_api.pojo.example.CommentPojo;
import management.rest_api.pojo.example.UserPojo;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;

public class ApiTest extends BaseApiTest {

    private static final String PATH_COMMENTS = "/comments";
    private static final String PATH_USERS = "/users";


    @Test(testName = "Verify if all comments have valid email (simple verification)")
    public void test() {

        Response response = BaseRestAssuredConfig.sendGetRequest(PATH_COMMENTS);
        List<CommentPojo> comments = BaseRestAssuredConfig.getObjectListFromApi(response, CommentPojo.class, "");

        comments.forEach(comment ->{
            boolean validEmail = Pattern.compile("^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$").matcher(comment.getEmail()).matches();
            Assert.assertTrue(validEmail, String.format("Verify if email %s is valid", comment.getEmail()));
        });
        System.out.println();
    }



    @Test(testName = "Convert JSON to POJO with Custom Deserializer and convert to JSON with Default way")
    public void test2() throws IOException {
        Response response = BaseRestAssuredConfig.sendGetRequest(PATH_USERS);

        List<UserPojo> users = new ObjectMapper().readValue(response.body().asString(), new TypeReference<List<UserPojo>>(){});

        users.forEach(user -> Assert.assertTrue(!user.getCompany().isEmpty(), "Verify if Company is not empty"));

        ObjectWriter writer = new ObjectMapper().writer().withDefaultPrettyPrinter();
        String json = writer.writeValueAsString(users);
        System.out.println(json);
    }
}
