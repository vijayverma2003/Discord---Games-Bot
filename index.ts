import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import commands from "./text-commands";

dotenv.config();

const prefix = "v.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

export const games: Collection<string, boolean> = new Collection();

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.content.toLowerCase().startsWith(prefix) || message.author.bot)
      return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift();

    if (!command) {
      await message.channel.send("Invalid Argument");
      return;
    }

    switch (command) {
      case "start":
        commands.start(message, args);
        break;

      case "help":
        commands.help(message);
        break;

      case "end":
        commands.end(message);
        break;

      default:
        await message.channel.send("Invalid Command");
        return;
    }
  } catch (error) {
    console.log(error);
    return;
  }
});

client.on(Events.Error, (error) => {
  console.log("Discord.js Error - ", error.message);
});

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
