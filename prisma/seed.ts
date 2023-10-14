import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.game.create({
  data: {
    number: 0,
  },
});
