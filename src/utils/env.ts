import { z } from "zod";

const envSchema = z.object({
  WORKSPACE_BOT_TOKEN: z.string(),
  SIGNING_SECRET: z.string(),
  CHANNEL_ID: z.string(),
  DATABASE_URL: z.string(),
  UP_GROUP_ID: z.string(),
  DOWN_GROUP_ID: z.string(),
  APP_TOKEN: z.string(),
  PORT: z.string().optional(),
});
export default envSchema.parse(process.env);
