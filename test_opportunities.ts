import { storage } from "./server/storage.js";
async function main() {
  const events = await storage.getOpportunities();
  console.log("Returned Opportunities:", events.map(e => ({id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, status: e.status, visibility: e.visibility})));
  process.exit(0);
}
main();
