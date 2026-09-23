# Third-party notices

Knead Time itself is Apache-2.0 (see `LICENSE`). It ships two typefaces with the
site — they are served from this origin rather than from a font CDN, so the
build redistributes the font files and carries their notices here — and one
runtime library, bundled into the single script the app is served as.

## Anton

Copyright 2020 The Anton Project Authors (<https://github.com/googlefonts/AntonFont>)

Licensed under the SIL Open Font License, Version 1.1
(<https://openfontlicense.org>). The full text ships with the font package, at
`node_modules/@fontsource/anton/LICENSE`.

## Archivo

Copyright 2020 The Archivo Project Authors (<https://github.com/Omnibus-Type/Archivo>)

Licensed under the SIL Open Font License, Version 1.1
(<https://openfontlicense.org>). The full text ships with the font package, at
`node_modules/@fontsource-variable/archivo/LICENSE`.

Both are packaged by [Fontsource](https://fontsource.org/); only the Latin and
Latin Extended subsets are declared in `src/app.css`.

## qrcode-generator

Copyright (c) 2009 Kazuhiko Arase (<https://github.com/kazuhikoarase/qrcode-generator>)

Licensed under the MIT License. The npm package ships no `LICENSE` file — the
notice is a header comment in `node_modules/qrcode-generator/dist/qrcode.js`
that minification strips from the bundle — so the full text is carried here:

> MIT License
>
> Copyright (c) 2009 Kazuhiko Arase
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

It is the only runtime dependency besides the two font packages (`dependencies`
in `package.json`); `src/lib/qr.ts` wraps it to draw the share-link QR on the
print sheet.
