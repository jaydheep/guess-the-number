# Guess the Number

Created by **jaydheep R (JK)**.

A number guessing game with six modes, a daily challenge, and an AI that guesses your number.

## Modes
- **Classic** (1 to 10, no try limit), **Medium** (1 to 50, 7 tries), **Hard** (1 to 100, 8 tries), **Insane** (1 to 1000, 11 tries).
- **Daily Challenge:** the same secret number for everyone each day, one attempt, with a shareable result.
- **AI guesses:** you think of a number from 1 to 100, and the AI finds it by always guessing the middle.

## How it works
- After every guess you see Go higher or Go lower, the range that is still possible on a number line, and a hot and cold meter.
- Up to 3 hints per game (even or odd, divisible by 3, prime). Hints lower your star rating.
- 3 stars for solving in the minimum number of tries without hints.
- Stats, streaks and best scores are saved in the browser (localStorage).
- Settings: sound, vibration, hot and cold meter, animations, and four colour themes.

Plain HTML, CSS and JavaScript, so there is no build step.

## Run locally
Run `python -m http.server` and visit http://localhost:8000.

## Deploy
Import this repo in Vercel with the **Other** framework preset. Leave the build command empty.
