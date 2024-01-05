import { EmbedBuilder } from "discord.js";

export function messageEmbed(message: string) {
  return [new EmbedBuilder().setDescription(`**${message}**`)];
}
