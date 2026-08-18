package pl.sundreamsoftware.poopclicker;

import static org.junit.Assert.*;

import android.content.Context;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("pl.sundreamsoftware.poopclicker", appContext.getPackageName());
    }

    @Test
    public void mainActivityLaunchesWithGameWebView() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull("Capacitor bridge must initialize", activity.getBridge());
                WebView webView = activity.getBridge().getWebView();
                assertNotNull("Game WebView must exist", webView);
                assertTrue("Game WebView must be visible", webView.isShown());
                assertTrue("JavaScript must be enabled", webView.getSettings().getJavaScriptEnabled());
            });
        }
    }
}
