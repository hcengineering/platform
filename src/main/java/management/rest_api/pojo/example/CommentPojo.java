package management.rest_api.pojo.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.gson.annotations.SerializedName;
import lombok.*;
import management.rest_api.pojo.BasePojo;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentPojo extends BasePojo {

    @JsonProperty("postId")
    private Integer postID;
    private Integer id;
    private String name;
    private String email;
    private String body;
}
