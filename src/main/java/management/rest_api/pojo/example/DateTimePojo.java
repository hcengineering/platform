package management.rest_api.pojo.example;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.*;


@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class DateTimePojo {

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd/MM/yyyy")
    private LocalDate date;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateTime;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private LocalDateTime dateTime2;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime time;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "h:mm:ss a", timezone = "US/Central")
    private LocalTime timeUS;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    private OffsetDateTime offsetDateTime;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ssXXX")
    private OffsetTime offsetTime;

}
