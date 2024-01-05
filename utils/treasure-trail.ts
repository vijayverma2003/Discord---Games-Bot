import { Collection } from "discord.js";

export function getMaxPointsHolder(points: Collection<string, number>) {
  return points.reduce(
    (max, points, userId) => (points > max.points ? { userId, points } : max),
    { userId: "", points: -1 }
  );
}

export function createGame() {
  const gameInfo = new Collection<
    string,
    number | boolean | Collection<string, number>
  >();

  gameInfo.set("active", true);
  gameInfo.set("points", new Collection<string, number>());

  return gameInfo;
}
