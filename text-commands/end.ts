import { Message } from "discord.js";
import { games } from "..";

export default async function execute(message: Message<boolean>) {
  try {
    if (!games.has(message.channelId)) {
      await message.channel.send(`The game has not been started yet 💀`);
      return;
    }

    games.delete(message.channelId);

    await message.channel.send(
      `Why would you do that? 🥺 Anyways, Game Over, thanks to ${message.author} 😒`
    );
  } catch (error) {
    console.log("Error occured while executing the end command!");
  }
}
