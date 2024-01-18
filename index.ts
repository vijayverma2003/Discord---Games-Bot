import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { messageEmbed } from "./embeds/treasure-trail";
import { wait } from "./utils/helper";
import dotenv from "dotenv";
import GlassBridgeGame from "./games/glass-bridge";
import TreasureTrail from "./games/treasure-trail";
import helpEmbed from "./embeds/help";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

export type Games = Collection<
  string,
  Collection<string, number | boolean | Collection<string, number> | string[]>
>;

const games: Games = new Collection();

const prefix = "v.";

client.on(Events.MessageCreate, async (message) => {
  try {
    const { content, channelId, author } = message;
    if (!content.toLowerCase().startsWith(prefix) || message.author.bot) return;
    const args = content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift();
    if (command === "help") {
      await message.channel.send({ embeds: [helpEmbed] });
      return;
    }
    const game = args.shift();
    const treasureTrailCommands = ["t", "tt", "treasure-trail"];
    const glassBridgeCommands = ["g", "gb", "glass-bridge"];
    if (command === "start") {
      if (game && treasureTrailCommands.includes(game)) {
        const numberOfRounds = parseInt(args.shift() || "");
        const duration = parseInt(args.shift() || "");
        const game = new TreasureTrail(
          message,
          games,
          numberOfRounds,
          duration
        );
        await wait(5);
        await game.beginGame();
      } else if (game && glassBridgeCommands.includes(game)) {
        const duration = parseInt(args.shift() || "");
        const game = new GlassBridgeGame(message, games, duration);
        await wait(2);
        game.beginGame();
      } else {
        await message.channel.send(
          "Invalid Options! Use `v.help` for more details :smiley:"
        );
      }
    } else if (command === "end") {
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
    } else {
      await message.channel.send("Invalid Command!");
    }
  } catch (error) {
    console.log(error);
    await message.channel.send("An error occured while executing the command.");
    return;
  }
});

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
