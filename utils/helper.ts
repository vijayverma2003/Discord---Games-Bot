import Canvas from "@napi-rs/canvas";
import { User } from "discord.js";
import { request } from "undici";

export function wait(seconds: number) {
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, seconds * 1000)
  );
}

export function generateRandomNumberInARange(min: number, max: number): number {
  const number = Math.floor(Math.random() * max - min) + min;
  console.log(number, min, max);
  return number;
}

export async function createCanvasImage(link: string, user: User | undefined) {
  const canvas = Canvas.createCanvas(500, 500);
  const context = canvas.getContext("2d");

  const background = await Canvas.loadImage(link);
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  if (user) {
    const { body } = await request(user.displayAvatarURL({ extension: "jpg" }));

    const avatar = await Canvas.loadImage(await body.arrayBuffer());
    context.drawImage(avatar, 155, 116, 190, 190);
  }

  return canvas.encode("webp");
}
