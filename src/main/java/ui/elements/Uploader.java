package ui.elements;

import ui.web.IWebContext;
import org.openqa.selenium.By;

import java.io.File;

public class Uploader extends Element {

    public Uploader(String name, IWebContext context, By loc) {
        super(name, context, loc);
    }

    public void upload(File file) {
        ACTION(String.format("Uploading file %s to %s", file.getAbsolutePath(), getLogicalName()));
        try {
            getWebElement().sendKeys(file.getAbsolutePath());
        } catch (Throwable e) {
            logError(String.format("ERROR caused by element %s, function input(%s).\n ERROR: %s", getLogicalName(), file.getAbsolutePath(), e));
        }
    }
}
