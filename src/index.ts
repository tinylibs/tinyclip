import {
  NodeProcessSpawner,
  readTextInternal,
  writeTextInternal
} from './internal.js';

const processSpawner = new NodeProcessSpawner();

/**
 * Reads text from the clipboard.
 */
export function readText(): Promise<string> {
  return readTextInternal({processSpawner});
}

/**
 * Writes text to the clipboard.
 */
export function writeText(text: string): Promise<void> {
  return writeTextInternal({text, processSpawner});
}
