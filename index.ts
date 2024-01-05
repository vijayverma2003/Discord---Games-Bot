import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { generateRandomNumberInARange, wait } from "./utils/helper";
import { getMaxPointsHolder, createGame } from "./utils/treasure-trail";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const games = new Collection<
  string,
  Collection<string, number | boolean | Collection<string, number>>
>();

client.on(Events.MessageCreate, (message) => {
  if (message.content === "!start") {
    const gameInfo = createGame();
    games.set(message.channelId, gameInfo);

    if (gameInfo) {
      message.channel.send("Starting Game...");

      let points = gameInfo.get("points") as Collection<string, number>;

      let currentRound = 0;
      let rounds = 3;

      const playRound = async () => {
        await wait(3);

        currentRound++;

        const min = 100;
        const max = 1000;

        let numberToGuess = generateRandomNumberInARange(min, max);
        console.log("Setting the number to guess: ", numberToGuess);

        let closestGuesser: null | string = null;
        let closestGuess = Number.MAX_SAFE_INTEGER;
        let minDifference = Number.MAX_SAFE_INTEGER;

        const collector = message.channel.createMessageCollector({
          filter: (msg) => !msg.author.bot && !isNaN(parseInt(msg.content)),
          time: 20000,
        });

        message.channel.send(
          `Attention treasure hunters! Guess the loot between ${min} - ${max}!`
        );

        collector.on("collect", (msg) => {
          if (games.get(message.channelId) === undefined) {
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

        collector.on("end", () => {
          if (games.get(message.channelId) === undefined) return;

          if (closestGuesser !== null) {
            const playerPoints = points.get(closestGuesser);
            const newPoints =
              closestGuess > numberToGuess ? numberToGuess : closestGuess;

            points.set(
              closestGuesser,
              playerPoints ? playerPoints + newPoints : newPoints
            );

            message.channel.send(
              `<@${closestGuesser}> have pulled off a loot heist! Good Job!`
            );
          }

          if (currentRound < rounds) {
            playRound();
          } else endRound();
        });
      };

      const endRound = async () => {
        if (games.get(message.channelId) === undefined) return;

        const winner = getMaxPointsHolder(points);
        await wait(3);

        message.channel.send(
          `Game Over! <@${winner.userId}> wins with ${winner.points} coins! 🥳`
        );
      };

      playRound();
    }
  }

  if (message.content === "!end") {
    games.delete(message.channelId);

    message.channel.send(
      `Why would you do that? :face_holding_back_tears: Anyways, Game Over, thanks to $<@{
        message.authr>.id
      )} :unamused:`
    );
  }
});

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
