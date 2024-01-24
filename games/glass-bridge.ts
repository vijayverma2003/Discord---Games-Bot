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
import { shuffle, wait } from "../utils/helper";

class GlassBridgeGame {
  private players: string[] = [];
  private gameStarted: boolean = false;
  private loopEnd = false;
  private readonly minNumberOfPlayers = 3;

  constructor(private message: Message<boolean>, private duration?: number) {
    const defaultDuration = 10;
    const minDuration = 5;
    const maxDuration = 30;

    if (duration)
      this.duration = Math.min(Math.max(duration, minDuration), maxDuration);
    else this.duration = defaultDuration;

    games.set(this.message.channelId, true);
  }

  handleException(error: any) {
    console.log("An unexpected error occured while sending a message", error);
    this.message.client.users.cache
      .get("874540112371908628")
      ?.send(
        `An unexpected error occured while sending a message in glass bridge! \n\`\`\`${error}\`\`\``
      );
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

      console.log(i.user.username);

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

    if (this.players.length < this.minNumberOfPlayers) {
      i.reply({
        content: `There should be at-least ${this.minNumberOfPlayers} players to start the game`,
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

    this.sendRemainingPlayers();

    if (this.isActive()) this.playRound();
  }

  getWelcomeMessage() {
    return `\n\n**Welcome to Glass Bridge Game!**\n\n**How it works?**\n\nClick the **Join** button to join the game\n\nAfter the game starts, every user will be asked to choose either left or right bridge. If your guess is correct then you will move on to new step but if you did not then welcome to the abyss...\n\n**Duration for each player - ** ${this.duration} seconds\n\nThe last person remaining will win the game 🙂\n\n`;
  }

  async beginGame() {
    const infoEmbed = new EmbedBuilder()
      .setAuthor({
        name: this.message.client.user.displayName,
        iconURL: this.message.client.user.displayAvatarURL(),
      })
      .setDescription(this.getWelcomeMessage())
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
    if (currentIndex >= this.players.length - 1) {
      if (this.players.length > 4) this.loopEnd = true;
      return 0;
    }
    return currentIndex + 1;
  }

  async removePlayer(index: number, timeOver?: boolean) {
    const userID = this.players[index];

    this.players.splice(index, 1);

    try {
      if (timeOver) {
        await this.message.channel.send(
          `Tick-tock, Time's cruel on the Glass Bridge. Hope you're ready for the free-fall finale`
        );
        return;
      } else
        await this.message.channel.send(
          `Oops <@${userID}>, your luck just hit rock bottom. Say hello to the abyss below 🪦`
        );
    } catch (error) {
      this.handleException(error);
    }
  }

  async sendRemainingPlayers() {
    const embed = new EmbedBuilder().setTitle("Remaining Players");

    let playersListDescription = ``;

    for (let player of this.players)
      playersListDescription += `- <@${player}>\n`;

    embed.setDescription(playersListDescription);

    try {
      if (!this.isActive()) return;
      await this.message.channel.send({ embeds: [embed] });
    } catch (error) {
      this.handleException(error);
    }
  }

  playRound() {
    let index = 0;

    const leftReactionEmoji = "⬅️";
    const rightReactionEmoji = "➡️";

    const gameRound = async () => {
      if (this.loopEnd) {
        this.sendRemainingPlayers();
        this.loopEnd = false;
      }

      await wait(3);

      const user = `<@${this.players[index]}>`;
      console.log(this.players);
      console.log("Index - ", index);
      console.log("Size - ", this.players.length);

      try {
        if (!this.isActive()) return;

        const msg = await this.message.channel.send(
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
          const randomNumber = Math.random();
          const hardGlassBridge = randomNumber > 0.5 ? "LEFT" : "RIGHT";
          console.log(randomNumber);

          if (
            (hardGlassBridge === "LEFT" &&
              reaction.emoji.name === leftReactionEmoji) ||
            (hardGlassBridge === "RIGHT" &&
              reaction.emoji.name === rightReactionEmoji)
          ) {
            await this.message.channel.send(
              `Hold up! You survived the chaos. But don't get cozy, darkness thrives on winners`
            );

            index = this.getNextIndex(index);

            collectorActive = false;
            collector.stop();
          } else {
            this.removePlayer(index);

            if (index >= this.players.length - 1) {
              if (this.players.length > 4) this.loopEnd = true;
              index = 0;
            }

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
            await this.message.channel.send(`The abyss claims it's silence...`);
          } else {
            index = this.getNextIndex(index);
            gameRound();
          }
        });
      } catch (error) {
        this.handleException(error);
      }
    };

    gameRound();
  }

  async endRound() {
    if (this.players.length < 1)
      await this.message.channel.send(`The abyss claims it's silence...`);
    else
      try {
        if (!this.isActive()) return;

        if (!games.get(this.message.channelId)) return;

        await this.message.channel.send(
          `🏆🏆 <@${this.players[0]}> won the game! 🏆🏆`
        );
      } catch (error) {
        this.handleException(error);
      }

    games.delete(this.message.channelId);
  }
}

export default GlassBridgeGame;
