import {
  AttachmentBuilder,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  User,
} from "discord.js";
import dotenv from "dotenv";
import {
  createCanvasImage,
  generateRandomNumberInARange,
  wait,
} from "./utils/helper";
import path from "path";
import { messageEmbed } from "./embeds/treasure-trail";

dotenv.config();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export const games = new Collection<
  string,
  Collection<string, number | boolean | Collection<string, number>>
>();

client.on(Events.MessageCreate, (message) => {
  const { content, channelId, author } = message;

  if (content === "!start") {
    const gameInfo = createGame();
    games.set(channelId, gameInfo);

    if (gameInfo) {
      message.channel.send({ embeds: messageEmbed("Starting Game...") });

      let points = gameInfo.get("points") as Collection<string, number>;
      let numberOfPlayersWithPoints = 0;

      let currentRound = 0;
      let rounds = 3;

      const playRound = async () => {
        await wait(7);

        currentRound++;

        let min = 99;
        let max = 999;

        let closestGuesser: null | string = null;
        let closestGuess = Number.MAX_SAFE_INTEGER;
        let minDifference = Number.MAX_SAFE_INTEGER;

        let userLoot =
          numberOfPlayersWithPoints > 1 && Math.random() > 0.7 ? true : false;
        const randomPlayer = points.randomKey();
        let randomPlayerUser: User | null = null;

        if (userLoot && randomPlayer) {
          max = Math.min(999, (points.get(randomPlayer) as number) * 0.5);
          const user = client.users.cache.get(randomPlayer as string);
          if (user) randomPlayerUser = user;
        }

        let numberToGuess = generateRandomNumberInARange(min, max);
        console.log("Setting the number to guess: ", numberToGuess);

        const collector = message.channel.createMessageCollector({
          filter: (msg) => !msg.author.bot && !isNaN(parseInt(msg.content)),
          time: 5000,
        });

        if (games.get(channelId) === undefined) return;

        if (!userLoot)
          message.channel.send({
            embeds: messageEmbed(
              `Attention treasure hunters! Guess the loot between ${min} - ${max}! 💰`
            ),
          });
        else {
          message.channel.send({
            embeds: messageEmbed(
              `${randomPlayerUser} dropped their coins! Let's steal it 🤑`
            ),
          });
        }

        collector.on("collect", (msg) => {
          if (games.get(channelId) === undefined) {
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
          if (games.get(channelId) === undefined) return;

          if (closestGuesser !== null) {
            const user = client.users.cache.get(closestGuesser);

            const playerPoints = points.get(closestGuesser);
            const newPoints =
              closestGuess > numberToGuess ? numberToGuess : closestGuess;

            points.set(
              closestGuesser,
              playerPoints ? playerPoints + newPoints : newPoints
            );

            numberOfPlayersWithPoints++;

            if (userLoot) {
              if (randomPlayer && closestGuesser !== randomPlayer) {
                points.set(
                  randomPlayer,
                  (points.get(randomPlayer) as number) - newPoints
                );

                message.channel.send({
                  embeds: messageEmbed(
                    `Oof, ${randomPlayerUser} lost their ${newPoints} coins 😔`
                  ),
                });
              } else if (closestGuesser === randomPlayer)
                message.channel.send({
                  embeds: messageEmbed(
                    `Woah, ${randomPlayerUser} didn't let anyone steal them coins! 😮`
                  ),
                });
              else {
                if (user) {
                  message.channel.send({
                    embeds: messageEmbed(
                      `OMG, ${user} stole ${newPoints} coins! 😮 `
                    ),
                  });
                }
              }
            } else
              message.channel.send({
                embeds: messageEmbed(
                  `${user} have pulled off a loot heist! Good Job!`
                ),
              });
          }

          if (currentRound < rounds) {
            playRound();
          } else endRound();
        });
      };

      const endRound = async () => {
        if (games.get(channelId) === undefined) return;

        const winner = getMaxPointsHolder(points);
        await wait(3);

        const user = client.users.cache.get(winner.userId);

        const attachment = new AttachmentBuilder(
          await createCanvasImage(
            path.join(__dirname, "../assets/winner.png"),
            user
          ),
          { name: "winner.webp" }
        );

        message.channel.send({
          files: [attachment],
          embeds: messageEmbed(
            `Game Over! ${user} won the game with ${winner.points} coins! 🥳`
          ),
        });
      };

      playRound();
    }
  }

  if (content === "!end") {
    games.delete(channelId);

    message.channel.send({
      embeds: messageEmbed(
        `Why would you do that? 🥺 Anyways, Game Over, thanks to ${author} 😒`
      ),
    });
  }
});

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

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
