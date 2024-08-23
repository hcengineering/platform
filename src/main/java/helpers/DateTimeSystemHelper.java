package helpers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DateTimeSystemHelper {

    public static final String SCREENSHOT_PATTERN = "dd-MM-yyyy_hh:mm:ss";
    public static final String DD_MM_YYYY_HH_MM_SS = "dd-MM-yyyy'T'HH_mm_ss";
    public static final String YYYY_MM_DD_HH_MM_SS = "yyyy-MM-dd'T'HH_mm_ss";



    public static String convertDateTimeToString(LocalDateTime localDateTime, String pattern){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
        return localDateTime.format(formatter);
    }

    public static String convertDateToString(LocalDate localDate, String pattern){
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
        return localDate.format(formatter);
    }
}
