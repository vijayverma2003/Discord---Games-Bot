import { EmbedBuilder, Message } from "discord.js";

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
            `** ** \n **Basic Commands-** \n ** ** \n- Use \`v.start [game]\` to start a game \n- Use \`v.end\` to end a game \n** **\n**Treasure Trail** -\n** **\n \`v.start treasure-trail [Number of Rounds] [Duration]\` \n ** ** \n**Glass Bridge** -\n** **\n \`v.start glass-bridge [Duration]\` \n`
          ),
      ],
    });
  } catch (error) {
    console.log("Error occured while executing the help embed!");
  }
}
