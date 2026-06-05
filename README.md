# 🎮 GameHub — The Ultimate Game Palace

13 browser games with local & online multiplayer. No login required. Progress saved for 24 hours.

## Games Included
| Game | Players | Modes |
|------|---------|-------|
| Tic-Tac-Toe | 2 | VS Computer, Local, Online |
| Chess | 2 | VS Computer (Medium AI), Local, Online |
| Checkers | 2 | VS Computer, Local, Online |
| Connect 4 | 2 | VS Computer, Local, Online |
| Ludo | 2–4 | Local, Online |
| Battleship | 2 | VS Computer, Local, Online |
| Poker (Texas Hold'em) | 2–10 | VS Computer, Local, Online |
| Memory Match | 1–4 | Solo, Local |
| Sudoku | 1 | Solo (Easy/Medium/Hard) |
| Crossword | 1 | Solo |
| Wordle | 1 | Solo |
| Snake | 1 | Solo |
| Minesweeper | 1 | Solo |
| 2048 | 1 | Solo |

## Prerequisites
- **Node.js** v18 or higher — [https://nodejs.org](https://nodejs.org)
- npm (included with Node.js)

## Quick Start

```bash
# 1. Extract the zip
unzip gamehub.zip
cd gamehub

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
# http://localhost:3000
```

For development with auto-restart:
```bash
npm run dev
```

## Project Structure
```
gamehub/
├── server/
│   ├── index.js              # Express + Socket.io server
│   ├── routes/
│   │   └── rooms.js          # REST API for room management
│   └── utils/
│       ├── roomManager.js    # In-memory room store (24h TTL)
│       └── socketHandler.js  # Real-time multiplayer events
├── client/public/
│   ├── index.html            # Main hub landing page
│   ├── css/main.css          # Global dark luxury theme
│   ├── js/main.js            # Hub logic, routing, ambient music
│   └── games/
│       ├── tictactoe/        # index.html + style.css + game.js
│       ├── chess/
│       ├── checkers/
│       ├── connect4/
│       ├── ludo/
│       ├── sudoku/
│       ├── crossword/
│       ├── battleship/
│       ├── memory/
│       ├── wordle/
│       ├── poker/
│       ├── snake/
│       ├── minesweeper/
│       └── 2048/
├── package.json
└── README.md
```

## Online Multiplayer
1. Host clicks **Play Online → HOST** and shares the 6-character code.
2. Friend clicks **Play Online → JOIN** and enters the code + their name.
3. Both players are connected via WebSockets (Socket.io).
4. Rooms expire after 24 hours automatically.

## Local Multiplayer
- Pass-and-play on the same device.
- Each player enters their name before the game starts.
- For games like Battleship (with hidden information), the screen prompts players to hand over the device.

## Data Persistence
- All solo game progress (Sudoku, Wordle, 2048, Snake best score) is saved in **localStorage** for 24 hours.
- No database is required.
- Clearing browser data will reset progress.

## Database Setup (Optional)
If you want persistent leaderboards or cross-device saved games, see the **Database** section in the PDF documentation.

## Environment Variables
```env
PORT=3000          # Server port (default: 3000)
```

## Tech Stack
- **Backend:** Node.js + Express + Socket.io
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework)
- **Persistence:** localStorage (client-side, 24h TTL)
- **Real-time:** WebSockets via Socket.io

## Browser Support
Chrome 90+, Firefox 88+, Safari 14+, Edge 90+  
Mobile: iOS Safari 14+, Android Chrome 90+

## License
MIT — free to use and modify.
