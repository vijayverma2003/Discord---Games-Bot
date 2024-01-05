import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
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

function createGame(channelID: string) {
  const gameInfo = new Collection<
    string,
    number | boolean | Collection<string, number>
  >();

  gameInfo.set("active", true);
  gameInfo.set("points", new Collection<string, number>());
  gameInfo.set("currentRound", 0);
  gameInfo.set("rounds", 3);
  gameInfo.set("charity", false);

  games.set(channelID, gameInfo);
}

client.on(Events.MessageCreate, (message) => {
  if (message.content === "!start") {
    createGame(message.channelId);

    const game = games.get(message.channelId);

    if (!game) message.channel.send("Start game using !start command :smile:");
    else {
      message.channel.send("Starting Game...");

      let currentRound = game.get("currentRound") as number;
      let points = game.get("points") as Collection<string, number>;
      let rounds = game.get("rounds") as number;

      const playRound = async () => {
        console.log(currentRound);
        await wait(3);

        game.set("currentRound", currentRound++);

        const min = 100;
        const max = 1000;

        let numberToGuess = generateRandomNumberInARange(min, max);
        let closestGuesser: null | string = null;
        let closestGuess: number = Number.MAX_SAFE_INTEGER;
        let minDifference: number = Number.MAX_SAFE_INTEGER;

        console.log("Setting the number to guess: ", numberToGuess);

        const collector = message.channel.createMessageCollector({
          filter: (msg) => !msg.author.bot,
          time: 30000,
        });

        message.channel.send(
          `Attention treasure hunters! Guess the loot between ${min} - ${max}!`
        );

        collector.on("collect", (msg) => {
          console.log("Bla ", games.get(message.channelId));
          if (games.get(message.channelId) === undefined) {
            console.log("hello");
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
            const authorPoints = points.get(closestGuesser);
            const newPoints =
              closestGuess > numberToGuess ? numberToGuess : closestGuess;

            points.set(
              closestGuesser,
              authorPoints ? authorPoints + newPoints : newPoints
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
          `Game Over! $<@{.userd>)} wins with ${winner.points} coins! 🥳`
        );
      };

      playRound();
    }
  }

  if (message.content === "!end") {
    const game = games.get(message.channelId);
    game && game.set("active", false);

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

function wait(seconds: number) {
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, seconds * 1000)
  );
}

function getMaxPointsHolder(points: Collection<string, number>) {
  return points.reduce(
    (max, points, userId) => (points > max.points ? { userId, points } : max),
    { userId: "", points: -1 }
  );
}

function generateRandomNumberInARange(min: number, max: number) {
  return Math.floor(Math.random() * max - min) + min;
}

function resetGame(channelID: string) {
  games.delete(channelID);
}
