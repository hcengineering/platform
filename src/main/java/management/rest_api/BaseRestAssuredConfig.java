package management.rest_api;

import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.config.HttpClientConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import management.environment.ApiEnvironment;
import management.rest_api.pojo.BasePojo;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpStatus;

import java.util.List;

import static io.restassured.RestAssured.given;

public class BaseRestAssuredConfig {

    protected static final String API_BASE_URL = ApiEnvironment.getURL();
    protected static final ContentType JSON = ContentType.JSON;

    public static void init() {
        RestAssured.requestSpecification = new RequestSpecBuilder()
                .setConfig(createTimeoutConfig())
                //todo: add headers if required
                .setBaseUri(API_BASE_URL)
                .setContentType(JSON)
                .build();

        RestAssured.responseSpecification = new ResponseSpecBuilder()
                .expectStatusCode(HttpStatus.SC_OK)
                .build();
    }

    private static RestAssuredConfig createTimeoutConfig(){
        return RestAssured.config()
                .httpClient(
                        HttpClientConfig.httpClientConfig()
                                .setParam("http.connection.timeout", ApiEnvironment.getRequestTimeout())
                                .setParam("http.socket.timeout", ApiEnvironment.getRequestTimeout()));
    }

    public static Response sendPostRequestAndGetResponse(BasePojo requestPojo, String uri, int statusCode) {
        RequestSpecification requestSpecification = given()
                .config(createTimeoutConfig())
                .basePath(uri);
        //        .cookies(cookies);

        ResponseSpecification respSpec = new ResponseSpecBuilder().expectStatusCode(statusCode).build();

        if (requestPojo != null)
            requestSpecification.body(requestPojo);

        requestSpecification.then().spec(respSpec);

        Response response = requestSpecification.post();

        return response;
    }

    public static Response sendGetRequest(String uri) {
        RequestSpecification requestSpecification = given()
                .config(createTimeoutConfig());
                //.basePath(uri);
                //.cookies(cookies);

        Response response = requestSpecification
                .get(uri)
                .then()
                .extract()
                .response();
        return response;
    }

    public static <T extends BasePojo> List<T> getObjectListFromApi(Response response, Class<T> classToConvert, String... paths) {
        String fullPath = createFullJsonPath(paths);
        JsonPath jsonPath = getJsonPath(response);
        return jsonPath.getList(fullPath, classToConvert);
    }

    public static <T extends BasePojo> T getObjectFromApi(Response response, Class<T> classToConvert, String... paths) {
        String fullPath = createFullJsonPath(paths);
        JsonPath jsonPath = getJsonPath(response);
        return jsonPath.getObject(fullPath, classToConvert);
    }

    private static String createFullJsonPath(String... paths) {
        String fullPath = "";
        if(paths != null && paths.length > 0)
            fullPath = fullPath + "." + StringUtils.join(paths, ".");
        return fullPath;
    }



    private static JsonPath getJsonPath(Response response) {
        var body = response.body();
        return body.jsonPath();
    }
}
