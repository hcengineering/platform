package ui.elements;

import ui.web.IWebContext;
import org.openqa.selenium.By;

public class Button extends Element{

    public Button(String name, IWebContext context, By loc) {
        super(name, context, loc);
    }

}
