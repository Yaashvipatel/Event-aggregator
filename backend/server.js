const http = require("http");
const env = require("./src/config/env");
const { connectDB, disconnectDB } = require("./src/config/db");
const app = require("./src/app");
const realtime = require("./src/realtime");
const reminders = require("./src/services/reminders");
const User = require("./src/models/User");
const { seedData } = require("./scripts/seed");

async function main() {
  await connectDB();

  // First run on an empty database: load demo users/events so the app is usable immediately.
  if (env.autoSeed && (await User.estimatedDocumentCount()) === 0) {
    console.log("[seed] empty database - loading demo data");
    await seedData();
  }

  const server = http.createServer(app);
  realtime.init(server);
  reminders.start();

  server.listen(env.port, () => {
    console.log(`\nCampus Event Aggregator running -> http://localhost:${env.port}`);
    console.log(`Recommender service expected at ${env.recommenderUrl} (falls back locally if offline)\n`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
