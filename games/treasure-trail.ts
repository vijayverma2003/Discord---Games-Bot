import {
  AttachmentBuilder,
  Collection,
  EmbedBuilder,
  Message,
} from "discord.js";
import { games } from "..";
import { createCanvasImage, generateRandomNumber, wait } from "../utils/helper";
import Game from "./game";

class TreasureTrail extends Game {
  protected readonly name = "TREASURE_TRAIL";
  private readonly duration?: number;
  private readonly numberOfRounds?: number;
  private readonly roundTimeGap = 10;
  private readonly beginningDelay: number = 10;
  private readonly userLootRequiredFrequency: number = 3;
  private readonly defaultNumberOfRounds = 5;
  private readonly minNumberOfRounds = 1;
  private readonly maxNumberOfRounds = 30;
  private readonly defaultDuration = 20;
  private readonly minDuration = 20;
  private readonly maxDuration = 90;
  private readonly numbersGuessed = new Set<number>();
  private currentRound: number;
  private message: Message<boolean>;
  private points: Collection<string, number> = new Collection();

  constructor(message: Message<boolean>, rounds?: number, duration?: number) {
    super();

    this.message = message;
    this.currentRound = 0;

    games.set(message.channelId, this.name);

    if (rounds)
      this.numberOfRounds = Math.min(
        Math.max(rounds, this.minNumberOfRounds),
        this.maxNumberOfRounds
      );
    else this.numberOfRounds = this.defaultNumberOfRounds;

    if (duration)
      this.duration = Math.min(
        Math.max(duration, this.minDuration),
        this.maxDuration
      );
    else this.duration = this.defaultDuration;
  }

  getWelcomeMessage(): string {
    return `\n\n**Welcome to Treasure Trail!**\n\n**How it works?**\n\nIn every round the mysterious treasure will appear with random amount of gems. The person to guess the closest number to the amount of gems in treasure will win those gems. The person with most gems at the end will win the game\n\n**Number of rounds -** ${this.numberOfRounds}\n\n**Duration of each round** - ${this.duration}s\n\n**Starting soon, Good luck guessing! :slight_smile:**`;
  }

  handleException(error: any) {
    console.log("An unexpected error occured while sending a message", error);
    this.message.client.users.cache
      .get("874540112371908628")
      ?.send(
        `An unexpected error occured while sending a message in treasure trail! \n \`\`\`${error}\`\`\``
      );
  }

  isActive() {
    return games.get(this.message.channelId) === this.name;
  }

  async beginGame() {
    try {
      if (!this.isActive()) return;

      await this.message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: this.message.client.user.displayName,
              iconURL: this.message.client.user.displayAvatarURL(),
            })
            .setDescription(this.getWelcomeMessage()),
        ],
      });
    } catch (error) {
      this.handleException(error);
    }

    await wait(this.beginningDelay);

    this.startGame();
  }

  private getMaxPointsHolder(points: Collection<string, number>) {
    return points.reduce(
      (max, points, userId) => (points > max.points ? { userId, points } : max),
      { userId: "", points: -1 }
    );
  }

  async startGame() {
    let timestamp = Math.floor(Date.now() / 1000) + this.roundTimeGap;

    try {
      if (!this.isActive()) return;

      await this.message.channel.send({
        embeds: [
          new EmbedBuilder().setDescription(
            `**Get Ready**\nStarting round ${this.currentRound + 1} of ${
              this.numberOfRounds
            } <t:${timestamp}:R>`
          ),
        ],
      });

      await wait(this.roundTimeGap);
    } catch (error) {
      this.handleException(error);
    }

    this.currentRound++;

    let min = 99;
    let max = 999;

    let closestGuesser: null | string = null;
    let closestGuess = Number.MAX_SAFE_INTEGER;
    let minDifference = Number.MAX_SAFE_INTEGER;

    const userLootAvailable =
      this.points.size > this.userLootRequiredFrequency && Math.random() > 0.7;

    const victimID = userLootAvailable
      ? (this.points.randomKey() as string)
      : undefined;
    const victimUser = userLootAvailable
      ? this.message.client.users.cache.get(victimID!)
      : undefined;

    if (userLootAvailable && victimID)
      max = Math.min(999, (this.points.get(victimID) as number) * 0.5);

    let numberToGuess = generateRandomNumber(min, max);

    const collector = this.message.channel.createMessageCollector({
      filter: (msg) =>
        !msg.author.bot &&
        !isNaN(parseInt(msg.content)) &&
        !this.numbersGuessed.has(parseInt(msg.content)),
      time: this.duration! * 1000,
    });

    if (!userLootAvailable)
      try {
        if (!this.isActive()) return;

        await this.message.channel.send({
          embeds: [
            new EmbedBuilder().setDescription(
              `<:treasure:1194161940650536981> **A mysterious treasure chest has appeared!**\n\n<:gem:1201740854285582336> Number of Gems: ${min} - ${max}\n\n<:kai1_whoa:1162566971838181437> Closest guess wins!`
            ),
          ],
        });
      } catch (error) {
        this.handleException(error);
      }
    else {
      try {
        if (!this.isActive()) return;

        await this.message.channel.send({
          embeds: [
            new EmbedBuilder().setDescription(
              `**${victimUser} accidently dropped their gems! <:gem:1201740854285582336>** \n\n<:gem:1201740854285582336> **Gems Count: ${min} - ${max}**\n\nClosest guess wins!`
            ),
          ],
        });
      } catch (error) {
        this.handleException(error);
      }
    }

    collector.on("collect", (msg) => {
      if (!this.isActive()) {
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
          this.numbersGuessed.add(numberGuessed);
        }
      }
    });

    collector.on("end", async () => {
      if (!this.isActive()) return;

      if (closestGuesser !== null) {
        const user = this.message.client.users.cache.get(closestGuesser);
        const amount = Math.min(closestGuess, numberToGuess);

        this.giveCoins(closestGuesser, amount);

        if (userLootAvailable && closestGuesser !== victimID) {
          this.takeCoins(victimID!, amount);

          try {
            if (!this.isActive()) return;

            await this.message.channel.send({
              embeds: [
                new EmbedBuilder().setDescription(
                  `Damn! ${user} stole ${victimUser}'s gems! 🫢`
                ),
              ],
            });
          } catch (error) {
            this.handleException(error);
          }
        } else if (userLootAvailable && closestGuesser === victimID)
          try {
            if (!this.isActive()) return;

            await this.message.channel.send({
              embeds: [
                new EmbedBuilder().setDescription(
                  `Woah ${user} got their ${amount} gems back!`
                ),
              ],
            });
          } catch (error) {
            this.handleException(error);
          }
        else
          try {
            if (!this.isActive()) return;

            await this.message.channel.send({
              embeds: [
                new EmbedBuilder().setDescription(
                  `Congratulations ${user}, you won ${amount} gems! <:gem:1201740854285582336>🤑`
                ),
              ],
            });
          } catch (error) {
            this.handleException(error);
          }
      } else {
        try {
          if (!this.isActive()) return;

          await this.message.channel.send({
            embeds: [
              new EmbedBuilder().setDescription(`No one collected any gems`),
            ],
          });
        } catch (error) {
          this.handleException(error);
        }
      }

      this.numbersGuessed.clear();

      if (this.currentRound < this.numberOfRounds!) {
        this.startGame();
      } else this.endRound();
    });
  }

  giveCoins(id: string, amount: number): void {
    const balanceBefore = this.points.get(id) || 0;
    this.points.set(id, balanceBefore + amount);
  }

  takeCoins(id: string, amount: number): void {
    const balanceBefore = this.points.get(id) || 0;
    if (amount > balanceBefore) this.points.set(id, 0);
    else this.points.set(id, balanceBefore - amount);
  }

  private async endRound() {
    if (!this.isActive()) return;

    const winner = this.getMaxPointsHolder(this.points);
    this.announceWinner(winner.userId, winner.points);
  }

  private async announceWinner(id: string, points: number) {
    const user = this.message.client.users.cache.get(id);

    if (!user)
      try {
        if (!this.isActive()) return;

        await this.message.channel.send({
          embeds: [
            new EmbedBuilder().setDescription(`No one won the game pfft!`),
          ],
        });
      } catch (error) {
        this.handleException(error);
      }
    else {
      const image = await createCanvasImage(user);

      let attachment: AttachmentBuilder | null = null;

      if (image)
        attachment = new AttachmentBuilder(image, {
          name: "winner.webp",
        });
      try {
        if (!this.isActive()) return;

        await this.message.channel.send({
          files: attachment ? [attachment] : undefined,
          embeds: [
            new EmbedBuilder().setDescription(
              `${user} won the game with ${points} gems <:gem:1201740854285582336>`
            ),
          ],
        });
      } catch (error) {
        this.handleException(error);
      }
    }

    games.delete(this.message.channelId);
  }
}

export default TreasureTrail;
