import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageActionRowComponentBuilder,
  MessageReaction,
  User,
} from "discord.js";
import { games } from "..";
import { sendGameMessage, shuffle, wait } from "../utils/helper";

class GlassBridgeGame {
  private players: string[] = [];
  private gameStarted: boolean = false;

  constructor(private message: Message<boolean>, private duration?: number) {
    const defaultDuration = 10;
    const minDuration = 5;
    const maxDuration = 30;

    if (duration)
      this.duration = Math.min(Math.max(duration, minDuration), maxDuration);
    else this.duration = defaultDuration;

    games.set(this.message.channelId, true);
  }

  createGameButtons() {
    const start = new ButtonBuilder()
      .setCustomId("start")
      .setLabel("Start 💥 ")
      .setStyle(ButtonStyle.Primary);

    const join = new ButtonBuilder()
      .setCustomId("join")
      .setLabel("Join 👧🏻")
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      start,
      join
    );
  }

  isActive() {
    return games.get(this.message.channelId);
  }

  async joinGame(
    i: ButtonInteraction<CacheType>,
    embed: EmbedBuilder,
    msg: Message<boolean>
  ) {
    try {
      if (!this.isActive()) {
        await i.reply({
          content: "This game already ended :slight_smile:",
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
        text: `${this.players.length} user${
          this.players.length > 1 ? "s" : ""
        } have joined the game`,
      });

      msg.edit({
        embeds: [embed],
      });

      await i.reply({
        content: `Hey ${i.user}, Welcome to the nightmare stroll – the Glass Bridge. Brace yourself for the unexpected :slight_smile:`,
        ephemeral: true,
      });
    } catch (error: any) {
      console.error("Join Game Error:", error.message);
      await i.reply({
        content: `An error occured while joining the game`,
        ephemeral: true,
      });
    }
  }

  async startGame(i: ButtonInteraction<CacheType>) {
    if (!this.isActive()) {
      await i.reply({
        content: "The game already ended :slight_smile:",
        ephemeral: true,
      });

      return;
    }

    if (this.players.length < 2) {
      i.reply({
        content: "There should be at-least two players to start the game",
        ephemeral: true,
      });
      return;
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
    const infoEmbed = new EmbedBuilder()
      .setAuthor({
        name: this.message.client.user.displayName,
        iconURL: this.message.client.user.displayAvatarURL(),
      })
      .setDescription(
        `** **\n**Welcome to Glass Bridge Game!**\n** **\n **How it works?**\n** **\nClick the **Join** button to join the game\n** **\nAfter the game starts, every user will be asked to choose either left or right bridge. If your guess is correct then you will move on to new step but if you did not then welcome to the abyss...\n** **\n**Duration for each player - ** ${this.duration}\n** **\nThe last person remaining will win the game 🙂\n** **\n`
      )
      .setFooter({ text: "No one has joined the game yet" });

    const msg = await this.message.channel.send({
      embeds: [infoEmbed],
      components: [this.createGameButtons()],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "join") this.joinGame(i, infoEmbed, msg);
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
      await sendGameMessage(
        this.message,
        `Tick-tock, Time's cruel on the Glass Bridge. Hope you're ready for the free-fall finale`
      );
      return;
    }

    await sendGameMessage(
      this.message,
      `Oops <@${userID}>, your luck just hit rock bottom. Say hello to the abyss below 🪦`
    );
  }

  playRound() {
    let index = 0;

    const leftReactionEmoji = "⬅️";
    const rightReactionEmoji = "➡️";

    const gameRound = async () => {
      const user = `<@${this.players[index]}>`;

      const msg = await sendGameMessage(
        this.message,
        `${user}, Choose a bridge to step on!`
      );

      if (!msg) return;

      await msg.react(leftReactionEmoji);
      await msg.react(rightReactionEmoji);

      const filter = (reaction: MessageReaction, user: User) =>
        user.id === this.players[index] &&
        (reaction.emoji.name === leftReactionEmoji ||
          reaction.emoji.name === rightReactionEmoji);

      const collector = msg.createReactionCollector({
        time: this.duration! * 1000,
        filter,
      });

      let collectorActive = true;

      collector.on("collect", async (reaction) => {
        // Cases -
        // 1. The number is greater than .5 and user selects the left emoji - Pass
        // 2. The number is less than .5 and user selects the left emoji - Fail
        // 3. The number is greater than .5 and user selects the right emoji - Fail
        // 3. The number is less than .5 and user selects the right emoji - Pass

        const hardGlassBridge = Math.random() > 0.5 ? "LEFT" : "RIGHT";

        if (
          (hardGlassBridge === "LEFT" &&
            reaction.emoji.name === leftReactionEmoji) ||
          (hardGlassBridge === "RIGHT" &&
            reaction.emoji.name === rightReactionEmoji)
        ) {
          await sendGameMessage(
            this.message,
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
        if (!collectorActive) return;

        this.removePlayer(index, true);

        if (this.players.length === 0) {
          await sendGameMessage(
            this.message,
            `The abyss claims it's silence...`
          );
        } else {
          index = this.getNextIndex(index);
          gameRound();
        }
      });
    };

    gameRound();
  }

  async endRound() {
    if (this.players.length < 1)
      await sendGameMessage(this.message, `The abyss claims it's silence...`);
    else
      await sendGameMessage(
        this.message,
        `🏆🏆 <@${this.players[0]}> won the game! 🏆🏆`
      );
  }
}

export default GlassBridgeGame;
