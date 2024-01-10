import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { messageEmbed } from "./embeds/treasure-trail";
import dotenv from "dotenv";
import TreasureTrail from "./games/treasure-trail";
import { wait } from "./utils/helper";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export type Games = Collection<
  string,
  Collection<string, number | boolean | Collection<string, number>>
>;

const games: Games = new Collection();

client.on(Events.MessageCreate, async (message) => {
  const { content, channelId, author } = message;

  if (content === "!start") {
    const game = new TreasureTrail(message, games);
    await wait(5);
    await game.playRound();
  }

  if (content === "!end") {
    if (!games.has(channelId)) {
      message.channel.send({
        embeds: messageEmbed(`The game has not been started yet 💀`),
      });
      return;
    }

    games.delete(channelId);

    message.channel.send({
      embeds: messageEmbed(
        `Why would you do that? 🥺 Anyways, Game Over, thanks to ${author} 😒`
      ),
    });
  }
});

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
