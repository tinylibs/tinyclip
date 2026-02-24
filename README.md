# tinyclip 📋

A tiny cross-platform clipboard library. Uses native OS clipboard functionality on Node.js, and the [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) in browsers.

## Install

```sh
npm install tinyclip
```

## Usage

```js
import { readText, writeText } from 'tinyclip'

// Async
await writeText('hello world')
const text = await readText()
```

## API

### `readText(): Promise<string>`

Reads text from the clipboard.

### `writeText(text: string): Promise<void>`

Writes text to the clipboard.

## License

[MIT](./LICENSE)
