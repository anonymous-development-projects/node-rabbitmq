export async function delay(ms: number): Promise<void> {
  // eslint-disable-next-line no-new
  new Promise((resolve) => setTimeout(resolve, ms));
}
