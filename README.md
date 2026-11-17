# Classical Ciphers

An interactive simulator for the substitution and transposition ciphers in Practical 01 of Cryptography & Information Security (2310324, Unit 1). Plain HTML, CSS and JavaScript with no build step and no dependencies to install — GSAP and the Google Sans webfonts are vendored locally.

**Live:** https://classical-ciphers.vercel.app

## Modules

**01 · Substitution**

- **Caesar** — every letter shifted by a fixed amount set with the slider. A rotating cipher wheel lines each plaintext letter up over its ciphertext letter.
- **Playfair** — digraph substitution over a 5×5 square built from a keyword (I and J share a cell). Every pair is traced through the square with the rule it used: same row shifts right, same column shifts down, otherwise swap columns.
- **Vigenère** — one Caesar shift per letter, cycling through a keyword, so the same letter encrypts differently at different positions.
- **One-time pad (Vernam)** — a random pad as long as the message, used once. Regenerate the pad and the same plaintext produces completely different ciphertext.

**02 · Transposition**

- **Rail fence** — letters written in a zigzag across 2–6 rails and read off row by row. The grid animates the path, and decrypt reverses the process.

Each module ends with a **How it works** animation that walks through the mechanism in three captioned steps.

## Run locally

Open `index.html` in a browser. There is nothing to install and nothing to build.

To serve it instead:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## Structure

| Path | Contents |
| --- | --- |
| `index.html` | Markup for both modules |
| `css/style.css` | All styling |
| `js/ciphers.js` | Cipher maths, DOM-free |
| `js/app.js` | Interface, cipher ring, trace and animations |
| `fonts/` | Google Sans, roman and italic |
| `vendor/gsap.min.js` | GSAP 3.12.5 |
