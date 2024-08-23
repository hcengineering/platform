package management.rest_api.pojo.example;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

public class UserDeserializer extends StdDeserializer<UserPojo> {

    public UserDeserializer() {
        this(null);
    }

    public UserDeserializer(Class<?> vc) {
        super(vc);
    }


    @Override
    public UserPojo deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        UserPojo user = new UserPojo();
        user.setId(node.get("id").intValue());
        user.setName(node.get("name").textValue());
        user.setUsername(node.get("email").textValue());
        user.setEmail(node.get("email").textValue());
        user.setPhone(node.get("phone").textValue());
        user.setWebsite(node.get("website").textValue());

        user.setAddress(AddressPojo.builder()
                .street(node.get("address").get("street").textValue())
                .city(node.get("address").get("city").textValue())
                .suite(node.get("address").get("suite").textValue())
                .zipcode(node.get("address").get("zipcode").textValue())
                .build());

        user.setCompany(node.get("company").get("name").textValue());
        return user;
    }
}
