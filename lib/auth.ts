import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

const postgresUrl = process.env.POSTGRES_URL;

const dialect = new Pool({
  connectionString: postgresUrl,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  }
});
