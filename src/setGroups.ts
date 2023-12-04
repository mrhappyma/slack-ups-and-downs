import { PrismaClient } from "@prisma/client";
import bolt from "@slack/bolt";
const { App } = bolt;
import env from "./utils/env.js";

const prisma = new PrismaClient();
const app = new App({
  token: env.WORKSPACE_BOT_TOKEN,
  signingSecret: env.SIGNING_SECRET,
});

const users = await prisma.user.findMany({});

const teamUp = users.filter((user) => user.team === "UP");
const teamDown = users.filter((user) => user.team === "DOWN");

await app.client.usergroups.users.update({
  usergroup: env.UP_GROUP_ID,
  users: teamUp.map((user) => user.id).join(","),
});
await app.client.usergroups.users.update({
  usergroup: env.DOWN_GROUP_ID,
  users: teamDown.map((user) => user.id).join(","),
});
