class AdAdapter {
  constructor() {
    this.provider = 'none';
  }

  initialize(providerConfig = {}) {
    this.provider = providerConfig.provider ?? 'none';
    console.info('[AdAdapter] Initialized provider:', this.provider);
  }

  showInterstitial(placement = 'default') {
    console.info(`[AdAdapter] Interstitial requested for placement: ${placement}`);
    // Future: bridge this method to AdMob/Unity Ads SDK in Capacitor native layer.
  }

  showRewarded(placement = 'reward-default') {
    console.info(`[AdAdapter] Rewarded ad requested for placement: ${placement}`);
  }
}

class CheckersGame {
  constructor({ boardEl, statusEl, turnBadgeEl, boardSizeSelect, themeSelect, captureRuleEl }) {
    this.boardEl = boardEl;
    this.statusEl = statusEl;
    this.turnBadgeEl = turnBadgeEl;
    this.boardSizeSelect = boardSizeSelect;
    this.themeSelect = themeSelect;
    this.captureRuleEl = captureRuleEl;

    this.adAdapter = new AdAdapter();
    this.adAdapter.initialize({ provider: 'none' });

    this.selected = null;
    this.legalMoves = [];
    this.startNewGame();
  }

  startNewGame() {
    this.size = Number(this.boardSizeSelect.value);
    this.currentPlayer = 'red';
    this.selected = null;
    this.legalMoves = [];
    this.board = this.createInitialBoard(this.size);
    this.render();
    this.updateStatus("Red's turn");
    this.updateTurnBadge();
  }

  createInitialBoard(size) {
    const board = Array.from({ length: size }, () => Array(size).fill(null));
    const rowsPerSide = size / 2 - 1;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if ((row + col) % 2 === 0) continue;

        if (row < rowsPerSide) board[row][col] = { player: 'black', king: false };
        if (row >= size - rowsPerSide) board[row][col] = { player: 'red', king: false };
      }
    }

    return board;
  }

  render() {
    this.boardEl.innerHTML = '';
    this.boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

    const mustCaptureMap = this.getAllCaptureMoves(this.currentPlayer);

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const square = document.createElement('button');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.type = 'button';
        square.setAttribute('aria-label', `Square ${row + 1}, ${col + 1}`);
        square.addEventListener('click', () => this.onSquareClick(row, col));

        if (this.selected && this.selected.row === row && this.selected.col === col) {
          square.classList.add('selected');
        }

        if (this.legalMoves.some((m) => m.to.row === row && m.to.col === col)) {
          square.classList.add('selectable');
        }

        const piece = this.board[row][col];
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `piece ${piece.player}${piece.king ? ' king' : ''}`;
          square.appendChild(pieceEl);

          if (
            piece.player === this.currentPlayer
            && mustCaptureMap.length === 0
            && !this.selected
          ) {
            square.classList.add('selectable');
          }

          if (
            piece.player === this.currentPlayer
            && mustCaptureMap.some((move) => move.from.row === row && move.from.col === col)
          ) {
            square.classList.add('selectable');
          }
        }

        this.boardEl.appendChild(square);
      }
    }
  }

  onSquareClick(row, col) {
    const piece = this.board[row][col];
    const mustCaptureMoves = this.getAllCaptureMoves(this.currentPlayer);

    if (piece && piece.player === this.currentPlayer) {
      const candidateMoves = this.getLegalMovesForPiece(row, col, mustCaptureMoves.length > 0);
      if (candidateMoves.length > 0) {
        this.selected = { row, col };
        this.legalMoves = candidateMoves;
      }
      this.render();
      return;
    }

    if (this.selected) {
      const move = this.legalMoves.find((m) => m.to.row === row && m.to.col === col);
      if (!move) return;
      this.applyMove(move);
    }
  }

  getDirections(piece) {
    if (piece.king) {
      return [
        { dr: 1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: -1, dc: -1 },
      ];
    }
    return piece.player === 'red'
      ? [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }]
      : [{ dr: 1, dc: -1 }, { dr: 1, dc: 1 }];
  }

  getLegalMovesForPiece(row, col, captureOnly = false) {
    const piece = this.board[row][col];
    if (!piece) return [];

    const moves = [];
    for (const { dr, dc } of this.getDirections(piece)) {
      const stepRow = row + dr;
      const stepCol = col + dc;
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;

      if (this.isInside(stepRow, stepCol) && !captureOnly && this.board[stepRow][stepCol] === null) {
        moves.push({ from: { row, col }, to: { row: stepRow, col: stepCol }, captured: null });
      }

      if (
        this.isInside(jumpRow, jumpCol)
        && this.board[jumpRow][jumpCol] === null
        && this.board[stepRow][stepCol]
        && this.board[stepRow][stepCol].player !== piece.player
      ) {
        moves.push({
          from: { row, col },
          to: { row: jumpRow, col: jumpCol },
          captured: { row: stepRow, col: stepCol },
        });
      }
    }

    return captureOnly ? moves.filter((m) => m.captured) : moves;
  }

  getAllCaptureMoves(player) {
    const captures = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = this.board[row][col];
        if (!piece || piece.player !== player) continue;
        captures.push(...this.getLegalMovesForPiece(row, col, true));
      }
    }
    return captures;
  }

  applyMove(move) {
    const movingPiece = this.board[move.from.row][move.from.col];
    this.board[move.from.row][move.from.col] = null;
    this.board[move.to.row][move.to.col] = movingPiece;

    if (move.captured) {
      this.board[move.captured.row][move.captured.col] = null;
    }

    const reachedBackRank = (
      (movingPiece.player === 'red' && move.to.row === 0)
      || (movingPiece.player === 'black' && move.to.row === this.size - 1)
    );
    if (reachedBackRank) movingPiece.king = true;

    if (move.captured) {
      const chainMoves = this.getLegalMovesForPiece(move.to.row, move.to.col, true);
      if (chainMoves.length > 0) {
        this.selected = { row: move.to.row, col: move.to.col };
        this.legalMoves = chainMoves;
        this.updateStatus(`${this.capitalize(this.currentPlayer)} continues capture chain.`);
        this.render();
        return;
      }
    }

    this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    this.selected = null;
    this.legalMoves = [];

    this.updateTurnBadge();
    const winner = this.getWinner();
    if (winner) {
      this.updateStatus(`${this.capitalize(winner)} wins! Start a new game to play again.`);
      this.adAdapter.showInterstitial('match_end');
    } else {
      this.updateStatus(`${this.capitalize(this.currentPlayer)}'s turn`);
    }

    this.render();
  }

  getWinner() {
    let redCount = 0;
    let blackCount = 0;

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = this.board[row][col];
        if (!piece) continue;
        if (piece.player === 'red') redCount += 1;
        if (piece.player === 'black') blackCount += 1;
      }
    }

    if (redCount === 0) return 'black';
    if (blackCount === 0) return 'red';

    const hasMove = this.playerHasMove(this.currentPlayer);
    if (!hasMove) return this.currentPlayer === 'red' ? 'black' : 'red';

    return null;
  }

  playerHasMove(player) {
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = this.board[row][col];
        if (!piece || piece.player !== player) continue;
        if (this.getLegalMovesForPiece(row, col).length > 0) return true;
      }
    }
    return false;
  }

  isInside(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  updateStatus(text) {
    this.statusEl.textContent = text;
  }

  updateTurnBadge() {
    this.turnBadgeEl.textContent = `Turn: ${this.capitalize(this.currentPlayer)}`;
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const turnBadgeEl = document.getElementById('turnBadge');
const boardSizeSelect = document.getElementById('boardSize');
const themeSelect = document.getElementById('theme');
const captureRuleEl = document.getElementById('captureRule');
const newGameBtn = document.getElementById('newGameBtn');

const game = new CheckersGame({
  boardEl,
  statusEl,
  turnBadgeEl,
  boardSizeSelect,
  themeSelect,
  captureRuleEl,
});

newGameBtn.addEventListener('click', () => {
  game.startNewGame();
});

boardSizeSelect.addEventListener('change', () => {
  game.startNewGame();
});

themeSelect.addEventListener('change', () => {
  document.body.classList.toggle('neon', themeSelect.value === 'neon');
});
