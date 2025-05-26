import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";
import "dotenv/config.js";
// Create connection

console.log("Connecting to Neon database...");
const database_url = process.env.NEON_DATABASE_URL;
// console.log(`Using database URL: ${database_url}`);

const sql = neon(process.env.NEON_DATABASE_URL);

// Create drizzle instance
if (!database_url) {
  throw new Error("NEON_DATABASE_URL environment variable is not set");
}
export const db = drizzle(sql, { schema });
