import {
  NodeProcessSpawner,
  readTextInternal,
  writeTextInternal,
  NodeReadCommandProvider,
  NodeWriteCommandProvider
} from './node.js';

const processSpawner = new NodeProcessSpawner();
const readCommandProvider = new NodeReadCommandProvider(processSpawner);
const writeCommandProvider = new NodeWriteCommandProvider(processSpawner);

/**
 * Reads text from the clipboard.
 */
export function readText(): Promise<string> {
  return readTextInternal({
    processSpawner,
    commandProvider: readCommandProvider
  });
}

/**
 * Writes text to the clipboard.
 */
export function writeText(text: string): Promise<void> {
  return writeTextInternal({
    text,
    processSpawner,
    commandProvider: writeCommandProvider
  });
}
