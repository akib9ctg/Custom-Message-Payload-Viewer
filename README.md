# Message Payload Viewer (Chrome Extension)

Internal dev tool for our API-sink environment. It captures HTML email payloads and SMS text from JSON logs (no real emails/SMS are sent) and renders them in a clean viewer tab for debugging.

## Setup
1. Edit `config.js`.
   - `CAPTURE_URL_SUBSTRING` should match the API/endpoint URL that returns the JSON.
   - Set `CAPTURE_ROUTES` to include the routes you want (example: `["/req/email", "/req/sms"]`).
   - If you prefer a single filter, set `ROUTE_FILTER` instead.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.

## Usage
- Open your site and trigger the request that returns the JSON.
- The extension opens a viewer tab automatically (if `AUTO_OPEN` is true).
- If multiple emails/SMS are present, the viewer shows a list at the top. Click one to preview.
- Use the tabs to switch between Emails and SMS.
- You can also click the extension icon to open the last captured messages.

## Notes
- If nothing appears, check the page console for `[JSON HTML Viewer]` logs.
- To restrict where the content script runs, edit `manifest.json` to replace `<all_urls>` in `matches` and `host_permissions`.

## Internal Note
This tool is for development/testing only. It reads from an API-sink that stores request logs for email/SMS; it does **not** send real messages.
