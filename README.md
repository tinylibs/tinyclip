# tinyclip 📋

A tiny cross-platform clipboard library. Uses native OS clipboard functionality on Node.js, and the [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) in browsers.

## Install

```sh
npm install tinyclip
```

## Usage

```js
import { readText, writeText, readTextSync, writeTextSync } from 'tinyclip'

// Async
await writeText('hello world')
const text = await readText()

// Sync (Node.js only)
writeTextSync('hello world')
const text = readTextSync()
```

## API

### `readText(): Promise<string>`

Reads text from the clipboard.

### `writeText(text: string): Promise<void>`

Writes text to the clipboard.

### `readTextSync(): string`

Reads text from the clipboard synchronously.

> [!NOTE]
> Not available in browsers.

### `writeTextSync(text: string): void`

Writes text to the clipboard synchronously.

> [!NOTE]
> Not available in browsers.

## License

[MIT](./LICENSE)
