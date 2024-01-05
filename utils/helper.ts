export function wait(seconds: number) {
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, seconds * 1000)
  );
}

export function generateRandomNumberInARange(min: number, max: number): number {
  return Math.floor(Math.random() * max - min) + min;
}
