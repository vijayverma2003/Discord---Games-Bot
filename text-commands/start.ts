import { Message } from "discord.js";
import TreasureTrail from "../games/treasure-trail";
import { games } from "../services/collections";
import GlassBridgeGame from "../games/glass-bridge";

const gameCommands = {
  treasureTrail: ["t", "tt", "treasure-trail"],
  glassBridge: ["g", "gb", "glass-bridge"],
};

export default async function execute(
  message: Message<boolean>,
  args: string[]
) {
  const game = args.shift();

  if (!game) {
    await message.channel.send(
      "Please choose a game to start. Use `v.help` for more information."
    );
    return;
  }

  const { treasureTrail, glassBridge } = gameCommands;

  if (treasureTrail.includes(game)) {
    const numberOfRounds = parseInt(args.shift() || "");
    const duration = parseInt(args.shift() || "");

    const game = new TreasureTrail(message, games, numberOfRounds, duration);
    await game.beginGame();
  } else if (glassBridge.includes(game)) {
    const duration = parseInt(args.shift() || "");
    const game = new GlassBridgeGame(message, games, duration);
    game.beginGame();
  } else {
    await message.channel.send(
      "Invalid Options! Use `v.help` for more information"
    );
  }
}
