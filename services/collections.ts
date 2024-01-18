import { Collection } from "discord.js";

export type Games = Collection<
  string,
  Collection<string, number | boolean | Collection<string, number> | string[]>
>;

export const games: Games = new Collection();
