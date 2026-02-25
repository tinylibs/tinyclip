import {
  NodeProcessSpawner,
  readTextInternal,
  writeTextInternal,
  NodeReadCommandProvider,
  NodeWriteCommandProvider
} from './internal.js';

const processSpawner = new NodeProcessSpawner();
/**
 * Reads text from the clipboard.
 */
export function readText(): Promise<string> {
  return readTextInternal({
    processSpawner,
    commandProvider: new NodeReadCommandProvider(processSpawner)
  });
}

/**
 * Writes text to the clipboard.
 */
export function writeText(text: string): Promise<void> {
  return writeTextInternal({
    text,
    processSpawner,
    commandProvider: new NodeWriteCommandProvider(processSpawner)
  });
}
