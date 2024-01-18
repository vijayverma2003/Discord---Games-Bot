import { EmbedBuilder, Message } from "discord.js";
import { botInfo } from "../services/constants";

export default {
  name: "help",
  async execute(message: Message<boolean>) {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: botInfo.botName,
            iconURL: botInfo.botIconURL,
          })
          .setDescription(botInfo.botCommandsInfo),
      ],
    });
  },
};
