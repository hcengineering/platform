package management.rest_api.pojo.example;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.*;
import management.rest_api.pojo.BasePojo;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonDeserialize(using = UserDeserializer.class)
public class UserPojo extends BasePojo {

    private Integer id;
    private String name;
    private String username;
    private String email;
    private AddressPojo address;
    private String phone;
    private String website;
    private String company;
}
