package selenium.api;

//import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.testng.annotations.Test;

import java.io.IOException;

public class JsonParsing extends BaseApiTest {

    private static final String DATE_JSON = "{\"date\":\"23/05/2019\",\"dateTime\":\"2016-10-30T14:22:25\",\"dateTime2\":\"2013-09-29T18:46:19.123Z\"," +
            "\"time\":\"14:22:25\", \"timeUS\":\"9:46:19 PM\"," +
            "\"offsetDateTime\":\"2007-12-03T10:15:30+01:00\",\"offsetTime\":\"10:15:30+03:00\"}";

    @Test(testName = "Simple Date parsing")
    public void test() throws IOException {

        //ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        //DateTimePojo dateTimePOJO = mapper.readValue(DATE_JSON, DateTimePojo.class);

        //System.out.println(dateTimePOJO);
    }

}
