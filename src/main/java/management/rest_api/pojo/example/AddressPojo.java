package management.rest_api.pojo.example;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import management.rest_api.pojo.BasePojo;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class AddressPojo extends BasePojo {

    private String street;
    private String suite;
    private String city;
    private String zipcode;
}
