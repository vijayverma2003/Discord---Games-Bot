import {
  AttachmentBuilder,
  Collection,
  EmbedBuilder,
  Message,
  User,
} from "discord.js";
import path from "path";
import { Games } from "..";
import { messageEmbed } from "../embeds/treasure-trail";
import { createCanvasImage, generateRandomNumber, wait } from "../utils/helper";

class TreasureTrail {
  private currentRound: number;
  private duration?: number;
  private games: Games;
  private message: Message<boolean>;
  private points: Collection<string, number>;
  private rounds?: number;

  constructor(
    message: Message<boolean>,
    games: Games,
    rounds?: number,
    duration?: number
  ) {
    this.message = message;
    this.games = games;
    this.currentRound = 0;

    const gameInfo = this.createGame();
    const updatedGames = this.games.set(message.channelId, gameInfo);

    this.points = updatedGames
      .get(this.message.channelId)
      ?.get("points") as Collection<string, number>;

    if (rounds) this.rounds = rounds;
    if (duration) this.duration = duration;

    this.message.channel.send({
      embeds: messageEmbed("Starting Treasure Trail... "),
    });
  }

  private getMaxPointsHolder(points: Collection<string, number>) {
    return points.reduce(
      (max, points, userId) => (points > max.points ? { userId, points } : max),
      { userId: "", points: -1 }
    );
  }

  private createGame() {
    const gameInfo = new Collection<string, Collection<string, number>>();
    gameInfo.set("points", new Collection<string, number>());
    return gameInfo;
  }

  private userLoot() {
    const userLootAvailability = this.points.size > 2 && Math.random() > 0.7;
    const victimID = this.points.randomKey() as string;
    const victimUser = this.message.client.users.cache.get(victimID);

    return { userLootAvailability, victimID, victimUser };
  }

  async beginGame() {
    this.currentRound++;

    let min = 99;
    let max = 999;

    let closestGuesser: null | string = null;
    let closestGuess = Number.MAX_SAFE_INTEGER;
    let minDifference = Number.MAX_SAFE_INTEGER;

    const { userLootAvailability, victimID, victimUser } = this.userLoot();

    if (userLootAvailability && victimID)
      max = Math.min(999, (this.points.get(victimID) as number) * 0.5);

    let numberToGuess = generateRandomNumber(min, max);

    const collector = this.message.channel.createMessageCollector({
      filter: (msg) => !msg.author.bot && !isNaN(parseInt(msg.content)),
      time: this.duration ? this.duration * 1000 : 20000,
    });

    if (this.games.get(this.message.channelId) === undefined) return;

    if (!userLootAvailability)
      this.message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "A mysterious treasure chest has appeared! <:treasure:1194161940650536981>"
            )
            .setDescription(
              `Guess the closest number to number of coins to win that treasure! (${min} - ${max})`
            ),
        ],
      });
    else {
      this.message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${victimUser} accidently dropped their coins! <:gold:1194161918940827659>`
            )
            .setDescription(
              `Guess the closest number to coins to steal them coins!`
            ),
        ],
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
        const amount = Math.min(closestGuess, numberToGuess);

        this.giveCoins(closestGuesser, amount);

        if (userLootAvailability && closestGuesser !== victimID) {
          this.takeCoins(victimID, amount);

          const message = await this.message.channel.send({
            embeds: messageEmbed(
              `${victimUser}, ${user} stole your coins coins! *(gossips...)* :joy:`
            ),
          });

          await wait(2);

          await message.edit({
            embeds: messageEmbed(
              `${victimUser}, ${user} stole your coins coins! 🫢`
            ),
          });
        } else if (userLootAvailability && closestGuesser === victimID)
          await this.message.channel.send({
            embeds: messageEmbed(
              `Woah ${user} got their ${amount} coins back!`
            ),
          });
        else
          await this.message.channel.send({
            embeds: messageEmbed(
              `Congratulations ${user}, you won ${amount} coins! 🤑`
            ),
          });
      }

      if (this.currentRound < (this.rounds || 5)) {
        await wait(7);
        this.beginGame();
      } else this.endRound();
    });
  }

  giveCoins(id: string, amount: number) {
    const balanceBefore = this.points.get(id) || 0;
    this.points.set(id, balanceBefore + amount);
  }

  takeCoins(id: string, amount: number) {
    const balanceBefore = this.points.get(id) || 0;
    if (amount > balanceBefore) this.points.set(id, 0);
    else this.points.set(id, balanceBefore - amount);
  }

  private async endRound() {
    if (!this.games.get(this.message.channelId)) return;

    const winner = this.getMaxPointsHolder(this.points);
    this.announceWinner(winner.userId, winner.points);
  }

  private async createWinnerAttachment(user: User) {
    return new AttachmentBuilder(
      await createCanvasImage(
        path.join(__dirname, "../../assets/winner.png"),
        user
      ),
      { name: "winner.webp" }
    );
  }

  private async announceWinner(id: string, points: number) {
    const user = this.message.client.users.cache.get(id);

    if (!user)
      await this.message.channel.send({
        embeds: messageEmbed(`No one won the game pfft!`),
      });
    else
      await this.message.channel.send({
        files: [await this.createWinnerAttachment(user)],
        embeds: messageEmbed(
          `${user} won the game with ${points} coins :tada:`
        ),
      });
  }
}

export default TreasureTrail;
