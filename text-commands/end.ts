import { Message } from "discord.js";
import { games } from "../services/collections";

export default {
  name: "end",
  async execute(message: Message<boolean>) {
    try {
      if (!games.has(message.channelId)) {
        await message.channel.send(`The game has not been started yet 💀`);
      }

      games.delete(message.channelId);

      await message.channel.send(
        `Why would you do that? 🥺 Anyways, Game Over, thanks to ${message.author} 😒`
      );
    } catch (error) {
      console.log(error);
      return;
    }
  },
};
