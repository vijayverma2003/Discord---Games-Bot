import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { messageEmbed } from "./embeds/treasure-trail";
import dotenv from "dotenv";
import TreasureTrail from "./games/treasure-trail";

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
    console.log(game);
    await game.playRound();
  }

  if (content === "!end") {
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
