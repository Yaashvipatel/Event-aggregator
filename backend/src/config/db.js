const mongoose = require("mongoose");
const env = require("./env");

let memoryServer = null;

async function connectDB() {
  let uri = env.mongoUri;

  if (env.useMemoryDb) {
    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require("mongodb-memory-server"));
    } catch {
      throw new Error(
        "USE_MEMORY_DB=true but mongodb-memory-server is not installed. Run: npm install mongodb-memory-server"
      );
    }
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri("campus_events");
    console.log("[db] using in-memory MongoDB (data is lost on restart)");
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`\n[db] Could not connect to MongoDB at ${uri}`);
    console.error("     Start MongoDB, set MONGO_URI in backend/.env, or set USE_MEMORY_DB=true\n");
    throw err;
  }
  console.log("[db] connected");
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB };
