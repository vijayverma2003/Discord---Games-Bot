import { EmbedBuilder, Message } from "discord.js";
import { prefix } from "..";

export default async function execute(message: Message<boolean>) {
  try {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: message.client.user.displayName,
            iconURL: message.client.user.displayAvatarURL(),
          })
          .setDescription(
            `** ** \n **Basic Commands-** \n ** ** \n- Use \`${prefix}start [game]\` to start a game \n- Use \`${prefix}end\` to end a game \n** **\n**Treasure Trail** -\n** **\n \`${prefix}start treasure-trail [Number of Rounds] [Duration]\` \n ** ** \n**Glass Bridge** -\n** **\n \`${prefix}start glass-bridge [Duration]\` \n`
          ),
      ],
    });
  } catch (error) {
    console.log("Error occured while executing the help embed!");
  }
}
