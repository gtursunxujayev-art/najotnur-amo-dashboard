import { sendQueuedNotifications } from "../lib/leadNotifications";

async function main() {
  console.log("[Queued Notifications] Starting scheduled job...");
  
  try {
    const sentCount = await sendQueuedNotifications();
    console.log(`[Queued Notifications] Sent ${sentCount} queued notifications`);
  } catch (error) {
    console.error("[Queued Notifications] Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
