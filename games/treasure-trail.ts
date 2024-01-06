import { AttachmentBuilder, Collection, Message, User } from "discord.js";
import { Games } from "..";
import { messageEmbed } from "../embeds/treasure-trail";
import path from "path";
import {
  createCanvasImage,
  generateRandomNumberInARange,
  wait,
} from "../utils/helper";

export function createTreasureTrailGame() {
  const gameInfo = new Collection<
    string,
    number | boolean | Collection<string, number>
  >();

  gameInfo.set("active", true);
  gameInfo.set("points", new Collection<string, number>());

  return gameInfo;
}

export function getMaxPointsHolder(points: Collection<string, number>) {
  return points.reduce(
    (max, points, userId) => (points > max.points ? { userId, points } : max),
    { userId: "", points: -1 }
  );
}

export default class TreasureTrail {
  message: Message<boolean>;
  games: Games;
  gameInfo: Collection<string, number | boolean | Collection<string, number>>;
  points: Collection<string, number>;
  numberOfPlayersWithPoints: number;
  currentRound: number;
  rounds: number;

  constructor(message: Message<boolean>, games: Games) {
    this.message = message;
    this.games = games;

    this.gameInfo = createTreasureTrailGame();
    this.games.set(message.channelId, this.gameInfo);

    this.points = this.gameInfo.get("points") as Collection<string, number>;
    this.numberOfPlayersWithPoints = 0;
    this.currentRound = 0;
    this.rounds = 3;

    this.message.channel.send({ embeds: messageEmbed("Starting Game...") });
  }

  async playRound() {
    console.log("Game Started");
    await wait(7);

    this.currentRound++;

    let min = 99;
    let max = 999;

    let closestGuesser: null | string = null;
    let closestGuess = Number.MAX_SAFE_INTEGER;
    let minDifference = Number.MAX_SAFE_INTEGER;

    let userLoot =
      this.numberOfPlayersWithPoints > 3 && Math.random() > 0.7 ? true : false;
    const randomPlayer = this.points.randomKey();
    let randomPlayerUser: User | null = null;

    if (userLoot && randomPlayer) {
      max = Math.min(999, (this.points.get(randomPlayer) as number) * 0.5);
      const user = this.message.client.users.cache.get(randomPlayer as string);
      if (user) randomPlayerUser = user;
    }

    let numberToGuess = generateRandomNumberInARange(min, max);
    console.log("Setting the number to guess: ", numberToGuess);

    const collector = this.message.channel.createMessageCollector({
      filter: (msg) => !msg.author.bot && !isNaN(parseInt(msg.content)),
      time: 5000,
    });

    if (this.games.get(this.message.channelId) === undefined) return;

    if (!userLoot)
      this.message.channel.send({
        embeds: messageEmbed(
          `Attention treasure hunters! Guess the loot between ${min} - ${max}! 💰`
        ),
      });
    else {
      this.message.channel.send({
        embeds: messageEmbed(
          `${randomPlayerUser} dropped their coins! Let's steal it 🤑`
        ),
      });
    }

    collector.on("collect", (msg) => {
      if (this.games.get(this.message.channelId) === undefined) {
        collector.stop();
        return;
      }

      const numberGuessed = parseInt(msg.content);

      if (typeof numberGuessed === "number") {
        const difference = Math.abs(numberToGuess - numberGuessed);

        if (difference <= minDifference) {
          minDifference = difference;
          closestGuess = numberGuessed;
          closestGuesser = msg.author.id;
        }
      }
    });

    collector.on("end", async () => {
      if (this.games.get(this.message.channelId) === undefined) return;

      if (closestGuesser !== null) {
        const user = this.message.client.users.cache.get(closestGuesser);

        const playerPoints = this.points.get(closestGuesser);
        const newPoints =
          closestGuess > numberToGuess ? numberToGuess : closestGuess;

        this.points.set(
          closestGuesser,
          playerPoints ? playerPoints + newPoints : newPoints
        );

        this.numberOfPlayersWithPoints++;

        if (userLoot && closestGuesser !== randomPlayer) {
          this.points.set(
            randomPlayer as string,
            (this.points.get(randomPlayer as string) as number) - newPoints
          );
        }

        this.message.channel.send({
          embeds: messageEmbed(
            `${user} successfully stole ${newPoints} coins! 🤑`
          ),
        });
      }

      if (this.currentRound < this.rounds) this.playRound();
      else this.endRound();
    });
  }

  async endRound() {
    if (this.games.get(this.message.channelId) === undefined) return;

    const winner = getMaxPointsHolder(this.points);
    await wait(5);

    const user = this.message.client.users.cache.get(winner.userId);

    const attachment = new AttachmentBuilder(
      await createCanvasImage(
        path.join(__dirname, "../assets/winner.png"),
        user
      ),
      { name: "winner.webp" }
    );

    this.message.channel.send({
      files: [attachment],
      embeds: messageEmbed(
        `Game Over! ${user} won the game with ${winner.points} coins! 🥳`
      ),
    });
  }
}
