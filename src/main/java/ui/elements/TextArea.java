package ui.elements;

import ui.web.IWebContext;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

public class TextArea extends Element {

    public TextArea(String name, IWebContext context, By loc) {
        super(name, context, loc);
    }

    public void setValue(String value) {
        ACTION(String.format("Input value %s to field %s", value, getLogicalName()));
        try {
            WebElement element = getWebElement();
            element.clear();
            element.sendKeys(value);
        } catch (Exception e){
            logError(String.format("ERROR caused by element %s, function input(%s).\n ERROR: %s", getLogicalName(), value, e));
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

    public String getText(){
        try {
            WebElement element = getWebElement();
            String value = element.getAttribute("value");
            if (value == null)
                value = element.getText();//todo check
            return value;
        } catch (Exception e){
            logError(String.format("ERROR caused by element %s, function getValue().\n ERROR: %s", getLogicalName(), e));
        }
        return null;
    }

}
