// Edit these values to match your app.
const CONFIG = {
  // Only capture responses whose URL includes this substring. Leave empty to capture all.
  CAPTURE_URL_SUBSTRING: "http://localhost:8090/res",
  // If set, only accept items with a matching route value.
  ROUTE_FILTER: "",
  // Preferred routes to capture (leave empty to capture all).
  CAPTURE_ROUTES: ["/req/email", "/req/sms"],
  // Route names for email and sms entries.
  EMAIL_ROUTE: "/req/email",
  SMS_ROUTE: "/req/sms",
  // Field used for SMS text in the parsed body.
  SMS_TEXT_FIELD: "body",
  // Also try to parse the current document body if it looks like JSON.
  CAPTURE_DOCUMENT: true,
  // Keys used inside the JSON.
  BODY_FIELD: "body",
  HTML_FIELD: "html",
  // Automatically open the viewer when HTML is captured.
  AUTO_OPEN: true,
  // Safety limit in characters.
  MAX_HTML_LENGTH: 2000000,
  // Console logging for debugging.
  LOG_TO_CONSOLE: true
};
