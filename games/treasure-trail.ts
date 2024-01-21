import {
  AttachmentBuilder,
  Collection,
  EmbedBuilder,
  Message,
} from "discord.js";
import { games } from "..";
import {
  createCanvasImage,
  generateRandomNumber,
  sendGameMessage,
  wait,
} from "../utils/helper";

class TreasureTrail {
  private readonly duration?: number;
  private readonly numberOfRounds?: number;
  private currentRound: number;
  private message: Message<boolean>;
  private points: Collection<string, number> = new Collection();

  constructor(message: Message<boolean>, rounds?: number, duration?: number) {
    this.message = message;
    this.currentRound = 0;

    games.set(message.channelId, true);

    const defaultNumberOfRounds = 3;
    const minNumberOfRounds = 1;
    const maxNumberOfRounds = 20;

    if (rounds)
      this.numberOfRounds = Math.min(
        Math.max(rounds, minNumberOfRounds),
        maxNumberOfRounds
      );
    else this.numberOfRounds = defaultNumberOfRounds;

    const defaultDuration = 30;
    const minDuration = 20;
    const maxDuration = 90;

    if (duration)
      this.duration = Math.min(Math.max(duration, minDuration), maxDuration);
    else this.duration = defaultDuration;
  }

  async beginGame() {
    await sendGameMessage(this.message, {
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: this.message.client.user.displayName,
            iconURL: this.message.client.user.displayAvatarURL(),
          })
          .setDescription(
            `** **\n**Welcome to Treasure Trail!**\n** **\n **How it works?**\n** **\n In every round the mysterious treasure will appear with random amount of coins. The person to guess the closest number to the amount of coins in treasure will win those coins. The person with most coins at the end will win the game\n ** ** \n**Number of rounds - ** ${this.numberOfRounds}\n** ** \n**Duration of each round - ** ${this.duration}\n** **\nGood luck guessing! :smiley:`
          ),
      ],
    });

    await wait(0);

    this.startGame();
  }

  private getMaxPointsHolder(points: Collection<string, number>) {
    return points.reduce(
      (max, points, userId) => (points > max.points ? { userId, points } : max),
      { userId: "", points: -1 }
    );
  }

  private userLoot() {
    const userLootAvailability = this.points.size > 0 && Math.random() > 0.7;
    const victimID = this.points.randomKey() as string;
    const victimUser = this.message.client.users.cache.get(victimID);

    return { userLootAvailability, victimID, victimUser };
  }

  async startGame() {
    let waitingTime = 10;
    let timestamp = Math.floor(Date.now() / 1000) + waitingTime;

    await sendGameMessage(this.message, {
      embeds: [
        new EmbedBuilder()
          .setTitle("Get Ready")
          .setDescription(
            `Starting round ${this.currentRound + 1} of ${
              this.numberOfRounds
            } <t:${timestamp}:R>`
          ),
      ],
    });

    await wait(waitingTime);

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

    if (!userLootAvailability)
      await sendGameMessage(this.message, {
        embeds: [
          new EmbedBuilder()
            .setTitle(`A mysterious treasure chest has appeared!`)
            .setDescription(
              `Guess the number of coins between ${min} and ${max} to get those coins <:treasure:1194161940650536981>`
            ),
        ],
      });
    else {
      await sendGameMessage(this.message, {
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${victimUser} accidently dropped their coins! <:gold:1194161918940827659>`
            )
            .setDescription(
              `Guess the closest number to coins between ${min} and ${max} to steal them coins! `
            ),
        ],
      });
    }

    collector.on("collect", (msg) => {
      if (!games.get(this.message.channelId)) {
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
      if (!games.get(this.message.channelId)) return;

      if (closestGuesser !== null) {
        const user = this.message.client.users.cache.get(closestGuesser);
        const amount = Math.min(closestGuess, numberToGuess);

        this.giveCoins(closestGuesser, amount);

        if (userLootAvailability && closestGuesser !== victimID) {
          this.takeCoins(victimID, amount);

          await sendGameMessage(this.message, {
            embeds: [
              new EmbedBuilder().setDescription(
                `Damn! ${user} stole ${victimUser}'s coins! 🫢`
              ),
            ],
          });
        } else if (userLootAvailability && closestGuesser === victimID)
          await sendGameMessage(this.message, {
            embeds: [
              new EmbedBuilder().setDescription(
                `Woah ${user} got their ${amount} coins back!`
              ),
            ],
          });
        else
          await sendGameMessage(this.message, {
            embeds: [
              new EmbedBuilder().setDescription(
                `Congratulations ${user}, you won ${amount} coins! 🤑`
              ),
            ],
          });
      } else {
        await sendGameMessage(this.message, {
          embeds: [
            new EmbedBuilder().setDescription(
              `Why would you leave? Is that because I am a bot and I have no feelings? :sob: #JusticeForBots`
            ),
          ],
        });
      }

      if (this.currentRound < this.numberOfRounds!) {
        this.startGame();
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
    if (!games.get(this.message.channelId)) return;

    const winner = this.getMaxPointsHolder(this.points);
    this.announceWinner(winner.userId, winner.points);
  }

  private async announceWinner(id: string, points: number) {
    const user = this.message.client.users.cache.get(id);

    if (!user)
      await sendGameMessage(this.message, {
        embeds: [
          new EmbedBuilder().setDescription(`No one won the game pfft!`),
        ],
      });
    else {
      const image = await createCanvasImage(user);

      let attachment: AttachmentBuilder | null = null;

      if (image)
        attachment = new AttachmentBuilder(image, {
          name: "winner.webp",
        });

      await sendGameMessage(this.message, {
        files: attachment ? [attachment] : undefined,
        embeds: [
          new EmbedBuilder().setDescription(
            `${user} won the game with ${points} coins :tada:`
          ),
        ],
      });
    }
  }
}

export default TreasureTrail;
