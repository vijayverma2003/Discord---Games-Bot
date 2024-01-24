import { Message } from "discord.js";
import { games } from "..";
import GlassBridgeGame from "../games/glass-bridge";
import TreasureTrail from "../games/treasure-trail";

const gameCommands = {
  treasureTrail: ["t", "tt", "treasure-trail"],
  glassBridge: ["g", "gb", "glass-bridge"],
};

const { treasureTrail, glassBridge } = gameCommands;

export default async function execute(
  message: Message<boolean>,
  args: string[]
) {
  try {
    const game = args.shift();

    if (games.get(message.channelId)) {
      await message.channel.send(
        "A game has been already started. Use `v.end` to end the ongoing game"
      );

      return;
    }

    if (!game) {
      await message.channel.send(
        "Please choose a game to start. Use `v.help` for more information."
      );
      return;
    }

    if (treasureTrail.includes(game.toLowerCase())) {
      const numberOfRounds = parseInt(args.shift() || "");
      const duration = parseInt(args.shift() || "");

      const game = new TreasureTrail(message, numberOfRounds, duration);
      await game.beginGame();
    } else if (glassBridge.includes(game.toLowerCase())) {
      const duration = parseInt(args.shift() || "");
      const game = new GlassBridgeGame(message, duration);
      game.beginGame();
    } else {
      await message.channel.send(
        "Invalid Options! Use `v.help` for more information"
      );
    }
  } catch (error) {
    console.log("Error occured while executing the game command!");
  }
}
