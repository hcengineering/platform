package management.rest_api.pojo;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UserLoginPojo extends BasePojo {

    private String username;
    private String password;

    public UserLoginPojo(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String toString() {
        return "UserLoginDTO{" +
                "username='" + username + '\'' +
                ", password='" + password + '\'' +
                '}';
    }
}
