import "@/styles/style.pcss";
import "@/plugins";
import "@/views";

import registerServiceWorker from "@/service-worker/registration";

if (process.env.NODE_ENV === "production") {
  registerServiceWorker();
}
