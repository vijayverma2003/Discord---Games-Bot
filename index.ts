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
  const { content, channelId, channel, author } = message;

  if (content === "!start") {
    const gameInfo = createGame();
    games.set(channelId, gameInfo);

    if (gameInfo) {
      channel.send("Starting Game...");

      let points = gameInfo.get("points") as Collection<string, number>;
      let numberOfPlayersWithPoints = 0;

      let currentRound = 0;
      let rounds = 3;

      const playRound = async () => {
        await wait(3);

        currentRound++;

        let min = 99;
        let max = 999;

        let closestGuesser: null | string = null;
        let closestGuess = Number.MAX_SAFE_INTEGER;
        let minDifference = Number.MAX_SAFE_INTEGER;

        let userLoot = numberOfPlayersWithPoints > 1 ? true : false;
        const randomPlayer = points.randomKey();

        if (userLoot && randomPlayer) {
          max = Math.min(999, (points.get(randomPlayer) as number) * 0.5);
        }

        let numberToGuess = generateRandomNumberInARange(min, max);
        console.log("Setting the number to guess: ", numberToGuess);

        const collector = channel.createMessageCollector({
          filter: (msg) => !msg.author.bot && !isNaN(parseInt(msg.content)),
          time: 10000,
        });

        if (games.get(channelId) === undefined) return;

        if (!userLoot)
          channel.send(
            `### Attention treasure hunters! Guess the loot between ${min} - ${max}! 💰`
          );
        else
          channel.send(
            `### <@${randomPlayer}>'s dropped their coins! Let's steal it 🤑`
          );

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

        collector.on("end", () => {
          if (games.get(channelId) === undefined) return;

          if (closestGuesser !== null) {
            const playerPoints = points.get(closestGuesser);
            const newPoints =
              closestGuess > numberToGuess ? numberToGuess : closestGuess;

            points.set(
              closestGuesser,
              playerPoints ? playerPoints + newPoints : newPoints
            );

            numberOfPlayersWithPoints++;

            if (userLoot && randomPlayer && closestGuesser !== randomPlayer) {
              points.set(
                randomPlayer,
                (points.get(randomPlayer) as number) - newPoints
              );

              channel.send(
                `Oof, <@${randomPlayer}> lost their ${newPoints} coins 😔`
              );
            } else if (userLoot && closestGuesser === randomPlayer)
              channel.send(
                `Woah, <@${randomPlayer}> get their coins back! 😮 `
              );
            else if (userLoot)
              channel.send(
                `OMG, <@${closestGuess}> stole ${newPoints} coins! 😮 `
              );
            else
              channel.send(
                `### <@${closestGuesser}> have pulled off a loot heist! Good Job!`
              );
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

        channel.send(
          `### Game Over! <@${winner.userId}> wins with ${winner.points} coins! 🥳`
        );
      };

      playRound();
    }
  }

  if (content === "!end") {
    games.delete(channelId);

    channel.send(`### Why would you do that? 🥺`);
    channel.send(`### Anyways, Game Over, thanks to <@${author.id}> 😒`);
  }
});

client.on(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.TOKEN);
