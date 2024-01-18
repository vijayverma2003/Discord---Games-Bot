import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import end from "./text-commands/end";
import help from "./text-commands/help";
import start from "./text-commands/start";

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

    if (!command) {
      await message.channel.send("Invalid Argument");
      return;
    }

    if (command === "end") end(message);
    if (command === "start") start(message, args);
    if (command === "help") help(message);
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
