export function readText(): Promise<string> {
  return navigator.clipboard.readText();
}

export function writeText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
