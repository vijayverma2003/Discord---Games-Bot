import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  Collection,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageActionRowComponentBuilder,
  MessageReaction,
  User,
} from "discord.js";
import { Games } from "..";
import { shuffle, wait } from "../utils/helper";

class GlassBridgeGame {
  private players: string[];
  private gameStarted: boolean;

  constructor(
    private message: Message<boolean>,
    private games: Games,
    private duration?: number
  ) {
    this.message = message;
    this.games = games;
    this.gameStarted = false;

    if (duration) this.duration = duration;

    const gameInfo = this.createGame();
    const updatedGames = this.games.set(this.message.channelId, gameInfo);

    this.players = updatedGames
      .get(this.message.channelId)
      ?.get("players") as string[];
  }

  createGame() {
    const gameInfo = new Collection<string, string[]>();
    gameInfo.set("players", []);
    return gameInfo;
  }

  createGameButtons() {
    const start = new ButtonBuilder()
      .setCustomId("start")
      .setLabel("Start 👧🏻")
      .setStyle(ButtonStyle.Primary);

    const join = new ButtonBuilder()
      .setCustomId("join")
      .setLabel("Join 💥")
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      start,
      join
    );
  }

  isActive() {
    return this.games.get(this.message.channelId);
  }

  async joinGame(
    i: ButtonInteraction<CacheType>,
    embed: EmbedBuilder,
    msg: Message<boolean>
  ) {
    if (!this.isActive()) {
      await i.reply({
        content: "The game already ended :slight_smile:",
        ephemeral: true,
      });

      return;
    }

    if (this.gameStarted) {
      await i.reply({
        content: "The game has already started! :slight_smile:",
        ephemeral: true,
      });

      return;
    }

    if (this.players.find((player) => player === i.user.id)) {
      await i.reply({
        content: "You have already joined the game!",
        ephemeral: true,
      });

      return;
    }

    this.players.push(i.user.id);

    embed.setFooter({
      text: `${this.players.length} users joined the game`,
    });

    msg.edit({
      embeds: [embed],
    });

    await i.reply({
      content: `Hey ${i.user}, Welcome to the nightmare stroll – the Glass Bridge. Brace yourself for the unexpected :slight_smile:`,
      ephemeral: true,
    });
  }

  async startGame(i: ButtonInteraction<CacheType>) {
    if (!i.deferred) {
      console.error("Invalid or unknown interaction. Ignoring.");
      return;
    }

    if (this.players.length < 2) {
      i.reply({
        content: "There should be at-least two players to start the game",
        ephemeral: true,
      });
    }

    if (i.user.id !== this.message.author.id) return;

    await i.reply({
      content: `Starting game...`,
      ephemeral: true,
    });

    this.gameStarted = true;
    this.players = shuffle(this.players);

    await wait(2);
    if (this.isActive()) this.playRound();
  }

  async beginGame() {
    const embed = new EmbedBuilder()
      .setTitle("Glass Bridge")
      .setDescription(
        `\n **How to Play?** \n \n- Click the Join button to join the game \n- Click the Start button to start the game \n- The bot will ask you to select a glass to step on \n- React with left or right arrow to step on \n- You have ${
          this.duration || 10
        } seconds to step on any glass \n`
      )
      .setImage("https://i.imgur.com/KhcoRVa.png")
      .setFooter({
        text: `0 users joined the game`,
      });

    const msg = await this.message.channel.send({
      embeds: [embed],
      components: [this.createGameButtons()],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "join") this.joinGame(i, embed, msg);
      if (i.customId === "start") this.startGame(i);
    });
  }

  getNextIndex(currentIndex: number) {
    if (currentIndex === this.players.length - 1) return 0;
    return currentIndex + 1;
  }

  async removePlayer(index: number, timeOver?: boolean) {
    const userID = this.players[index];

    this.players.splice(index, 1);

    if (timeOver) {
      await this.message.channel.send(
        `Tick-tock, Time's cruel on the Glass Bridge. Hope you're ready for the free-fall finale`
      );
      return;
    }

    await this.message.channel.send(
      `Oops <@${userID}>, your luck just hit rock bottom. Say hello to the abyss below 🪦`
    );
  }

  playRound() {
    let index = 0;

    const leftReactionEmoji = "⬅️";
    const rightReactionEmoji = "➡️";

    const gameRound = async () => {
      const user = `<@${this.players[index]}>`;

      let collectorActive = false;

      if (!this.isActive()) return;

      const msg = await this.message.channel.send(
        `${user}, Choose a bridge to step on!`
      );
      await msg.react(leftReactionEmoji);
      await msg.react(rightReactionEmoji);

      const collectorFilter = (reaction: MessageReaction, user: User) =>
        user.id === this.players[index] &&
        (reaction.emoji.name === leftReactionEmoji ||
          reaction.emoji.name === rightReactionEmoji);

      const collector = msg.createReactionCollector({
        time: (this.duration || 10) * 1000,
        filter: collectorFilter,
      });

      collectorActive = true;

      collector.on("collect", async (reaction) => {
        if (!this.isActive()) return;

        if (reaction.emoji.name === leftReactionEmoji && Math.random() > 0.5) {
          await this.message.channel.send(
            `Hold up! You survived the chaos. But don't get cozy, darkness thrives on winners`
          );

          index = this.getNextIndex(index);

          collectorActive = false;
          collector.stop();
        } else {
          this.removePlayer(index);
          collectorActive = false;
          collector.stop();
        }

        if (this.players.length <= 1) this.endRound();
        else gameRound();
      });

      collector.on("end", async () => {
        if (!this.isActive()) return;

        if (!collectorActive) return;

        this.removePlayer(index, true);

        if (this.players.length === 0) {
          await this.message.channel.send(`The abyss claims it's silence...`);
        } else {
          index = this.getNextIndex(index);
          gameRound();
        }
      });
    };

    gameRound();
  }

  async endRound() {
    if (!this.isActive()) return;

    if (this.players.length < 1) {
      await this.message.channel.send(`The abyss claims it's silence...`);
    } else {
      await this.message.channel.send(
        `🏆🏆 <@${this.players[0]}> won the game! 🏆🏆`
      );
    }
  }
}

export default GlassBridgeGame;
