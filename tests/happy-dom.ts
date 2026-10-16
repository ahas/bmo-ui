import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Every test file runs with a document and a window of happy-dom's, so a test of the layer's code
// that reaches for the page finds one without setting it up itself. The browser lane drives a real
// Chromium through playwright and reads none of this.
GlobalRegistrator.register();
