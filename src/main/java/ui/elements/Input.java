package ui.elements;

import ui.web.IWebContext;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

public class Input extends Element{

    public Input(String name, IWebContext context, By loc) {
        super(name, context, loc);
    }

    public void input(String value){
        ACTION(String.format("Input value %s to field %s", value, getLogicalName()));
        try {
            WebElement element = getWebElement();
            element.clear();
            element.sendKeys(value);
        } catch (Exception e){
            logError(String.format("ERROR caused by element %s, function input(%s).\n ERROR: %s", getLogicalName(), value, e));
        }
    }

    public String getText(){
        try {
            String text = getWebElement().getAttribute("value");
            if (text == null)
                text = "";
            return text;
        } catch (Throwable e) {
            logError(String.format("ERROR caused by element %s, function getText().\n ERROR: %s", getLogicalName(), e));
            return null;
        }
    }

    public void clear(){
        ACTION(String.format("Clear field %s", getLogicalName()));
        try {
            getWebElement().clear();
        } catch (Exception e){
            logError(String.format("ERROR caused by element %s, function clear().\n ERROR: %s", getLogicalName(), e));
        }
    }
}
