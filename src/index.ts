import bolt from "@slack/bolt";
const { App } = bolt;
import env from "./utils/env.js";
import { PrismaClient, Team } from "@prisma/client";

const app = new App({
  token: env.WORKSPACE_BOT_TOKEN,
  signingSecret: env.SIGNING_SECRET,
});
const prisma = new PrismaClient();

app.event("app_mention", async ({ event, client }) => {
  client.reactions.add({
    channel: event.channel,
    timestamp: event.ts,
    name: "robot_face",
  });
});

let game = await prisma.game.findFirstOrThrow();
app.message(/^-?\d+$/, async ({ message, say, client }) => {
  if (message.channel != env.CHANNEL_ID) return;
  if (
    !(
      message.subtype === undefined ||
      message.subtype === "bot_message" ||
      message.subtype === "file_share" ||
      message.subtype === "thread_broadcast"
    )
  )
    return;
  const team = await getTeam(message.user!);
  const num = parseInt(message.text!);
  const target = team == "UP" ? game.number + 1 : game.number - 1;
  if (num != target) {
    client.reactions.add({
      channel: message.channel,
      timestamp: message.ts,
      name: "bangbang",
    });
    client.chat.postEphemeral({
      channel: message.channel,
      user: message.user!,
      text:
        "You're on team " + team + ", so the next number is " + target + ".",
    });
    return;
  }
  if (message.user == game.lastCounter) {
    client.reactions.add({
      channel: message.channel,
      timestamp: message.ts,
      name: "bangbang",
    });
    client.chat.postEphemeral({
      channel: message.channel,
      user: message.user!,
      text: "You can't count twice in a row!",
    });
    return;
  }
  game = await prisma.game.update({
    where: {
      id: game.id,
    },
    data: {
      number: target,
      lastCounter: message.user,
    },
  });
  if (target == 100) {
    game = await prisma.game.update({
      where: {
        id: game.id,
      },
      data: {
        number: 0,
        lastCounter: null,
        upTeamWins: game.upTeamWins + 1,
      },
    });
    client.chat.postMessage({
      channel: message.channel,
      text: `And that's a win for team UP! Great job, everyone!\nThe game has been reset. The next number is 1 or -1, depending on your team.\n\nUP team wins: ${game.upTeamWins}\nDOWN team wins: ${game.downTeamWins}`,
    });
  }
  if (target == -100) {
    game = await prisma.game.update({
      where: {
        id: game.id,
      },
      data: {
        number: 0,
        lastCounter: null,
        downTeamWins: game.downTeamWins + 1,
      },
    });
    client.chat.postMessage({
      channel: message.channel,
      text: `And that's a win for team DOWN! Great job, everyone!\nThe game has been reset. The next number is 1 or -1, depending on your team.\n\nUP team wins: ${game.upTeamWins}\nDOWN team wins: ${game.downTeamWins}`,
    });
  }
});

app.command("/team", async ({ command, ack, respond }) => {
  await ack();
  const team = await getTeam(command.user_id, false);
  await respond("You're on team " + team + "!");
});

app.event("member_joined_channel", async ({ event }) => {
  getTeam(event.user);
});

const getTeam = async (id: string, notifyOnCreate = true) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (user) return user.team;
  let team: Team;
  if (game.upTeamMembers > game.downTeamMembers) {
    team = "DOWN";
  } else if (game.upTeamMembers < game.downTeamMembers) {
    team = "UP";
  } else {
    const num = Math.floor(Math.random() * 2);
    team = num == 0 ? "UP" : "DOWN";
  }
  game = await prisma.game.update({
    where: {
      id: game.id,
    },
    data: {
      upTeamMembers: team == "UP" ? game.upTeamMembers + 1 : game.upTeamMembers,
      downTeamMembers:
        team == "DOWN" ? game.downTeamMembers + 1 : game.downTeamMembers,
    },
  });

  await prisma.user.create({
    data: {
      id,
      team,
    },
  });
  if (notifyOnCreate) {
    app.client.chat.postEphemeral({
      channel: env.CHANNEL_ID,
      user: id,
      text: "You're on team " + team + "!",
    });
  }
  return team;
};

app.start(3000);
