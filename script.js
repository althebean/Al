class AdAdapter {
  constructor() {
    this.provider = 'none';
  }

  initialize(providerConfig = {}) {
    this.provider = providerConfig.provider ?? 'none';
    console.info('[AdAdapter] initialized:', this.provider);
  }

  showInterstitial(placement = 'default') {
    console.info(`[AdAdapter] interstitial: ${placement}`);
  }

  showRewarded(placement = 'reward-default') {
    console.info(`[AdAdapter] rewarded: ${placement}`);
  }
}

class CheckersGame {
  constructor(elements) {
    this.el = elements;
    this.adAdapter = new AdAdapter();
    this.adAdapter.initialize({ provider: 'none' });

    this.selected = null;
    this.legalMoves = [];
    this.isAiThinking = false;

    this.attachEvents();
    this.startNewGame();
  }

  attachEvents() {
    this.el.newGameBtn.addEventListener('click', () => this.startNewGame());
    this.el.boardSize.addEventListener('change', () => this.startNewGame());
    this.el.playMode.addEventListener('change', () => this.startNewGame());
    this.el.playerColor.addEventListener('change', () => this.startNewGame());
    this.el.difficulty.addEventListener('change', () => this.startNewGame());

    this.el.theme.addEventListener('change', () => {
      document.body.classList.toggle('midnight', this.el.theme.value === 'midnight');
    });
  }

  startNewGame() {
    this.size = Number(this.el.boardSize.value);
    this.playMode = this.el.playMode.value;
    this.humanColor = this.el.playerColor.value;
    this.aiColor = this.humanColor === 'red' ? 'black' : 'red';
    this.aiDepth = Number(this.el.difficulty.value);

    this.currentPlayer = 'red';
    this.selected = null;
    this.legalMoves = [];
    this.isAiThinking = false;
    this.gameOver = false;

    this.board = this.createInitialBoard(this.size);
    this.render();
    this.updateTurnBadge();
    this.updateStatus(`${this.capitalize(this.currentPlayer)} to move`);

    if (this.isAiTurn()) {
      this.queueAiMove();
    }
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

  cloneBoard(board) {
    return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
  }

  render() {
    this.el.board.innerHTML = '';
    this.el.board.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const square = document.createElement('button');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.type = 'button';
        square.setAttribute('aria-label', `Square ${row + 1}, ${col + 1}`);
        square.disabled = this.gameOver || this.isAiThinking;
        square.addEventListener('click', () => this.onSquareClick(row, col));

        if (this.selected && this.selected.row === row && this.selected.col === col) {
          square.classList.add('selected');
        }

        if (this.legalMoves.some((m) => m.to.row === row && m.to.col === col)) {
          square.classList.add('target');
        }

        const piece = this.board[row][col];
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = `piece ${piece.player}${piece.king ? ' king' : ''}`;
          square.appendChild(pieceEl);
        }

        this.el.board.appendChild(square);
      }
    }
  }

  onSquareClick(row, col) {
    if (this.gameOver || this.isAiThinking || this.isAiTurn()) return;

    const piece = this.board[row][col];
    const allMoves = this.getAllMoves(this.board, this.currentPlayer);

    if (piece && piece.player === this.currentPlayer) {
      const candidateMoves = allMoves.filter((m) => m.from.row === row && m.from.col === col);
      if (candidateMoves.length > 0) {
        this.selected = { row, col };
        this.legalMoves = candidateMoves;
        this.render();
      }
      return;
    }

    if (!this.selected) return;

    const move = this.legalMoves.find((m) => m.to.row === row && m.to.col === col);
    if (!move) return;

    this.applyMoveToLiveGame(move);
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

  isInside(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  getPieceMoves(board, row, col, captureOnly = false) {
    const piece = board[row][col];
    if (!piece) return [];

    const moves = [];
    for (const { dr, dc } of this.getDirections(piece)) {
      const stepRow = row + dr;
      const stepCol = col + dc;
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;

      if (
        this.isInside(stepRow, stepCol)
        && !captureOnly
        && board[stepRow][stepCol] === null
      ) {
        moves.push({
          from: { row, col },
          to: { row: stepRow, col: stepCol },
          captured: null,
        });
      }

      if (
        this.isInside(jumpRow, jumpCol)
        && board[jumpRow][jumpCol] === null
        && board[stepRow][stepCol]
        && board[stepRow][stepCol].player !== piece.player
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

  getAllMoves(board, player) {
    const captureMoves = [];
    const normalMoves = [];

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = board[row][col];
        if (!piece || piece.player !== player) continue;

        const moves = this.getPieceMoves(board, row, col, false);
        for (const move of moves) {
          if (move.captured) captureMoves.push(move);
          else normalMoves.push(move);
        }
      }
    }

    return captureMoves.length > 0 ? captureMoves : normalMoves;
  }

  applyMove(board, move) {
    const next = this.cloneBoard(board);
    const piece = next[move.from.row][move.from.col];

    next[move.from.row][move.from.col] = null;
    next[move.to.row][move.to.col] = piece;

    if (move.captured) {
      next[move.captured.row][move.captured.col] = null;
    }

    if ((piece.player === 'red' && move.to.row === 0) || (piece.player === 'black' && move.to.row === this.size - 1)) {
      piece.king = true;
    }

    let finalMove = move;
    if (move.captured) {
      const chain = this.getPieceMoves(next, move.to.row, move.to.col, true);
      if (chain.length > 0) {
        finalMove = chain[Math.floor(Math.random() * chain.length)];
        return this.applyMove(next, finalMove);
      }
    }

    return next;
  }

  applyMoveToLiveGame(move) {
    const movingPiece = this.board[move.from.row][move.from.col];
    this.board[move.from.row][move.from.col] = null;
    this.board[move.to.row][move.to.col] = movingPiece;

    if (move.captured) {
      this.board[move.captured.row][move.captured.col] = null;
    }

    if ((movingPiece.player === 'red' && move.to.row === 0) || (movingPiece.player === 'black' && move.to.row === this.size - 1)) {
      movingPiece.king = true;
    }

    if (move.captured) {
      const chainMoves = this.getPieceMoves(this.board, move.to.row, move.to.col, true);
      if (chainMoves.length > 0) {
        if (this.isAiTurn()) {
          const aiChain = chainMoves[Math.floor(Math.random() * chainMoves.length)];
          this.applyMoveToLiveGame(aiChain);
          return;
        }

        this.selected = { row: move.to.row, col: move.to.col };
        this.legalMoves = chainMoves;
        this.updateStatus(`${this.capitalize(this.currentPlayer)} continues capture chain`);
        this.render();
        return;
      }
    }

    this.finishTurn();
  }

  finishTurn() {
    this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    this.selected = null;
    this.legalMoves = [];

    this.updateTurnBadge();

    const winner = this.getWinner(this.board, this.currentPlayer);
    if (winner) {
      this.gameOver = true;
      this.updateStatus(`${this.capitalize(winner)} wins!`);
      this.adAdapter.showInterstitial('match_end');
      this.render();
      return;
    }

    if (this.isAiTurn()) {
      this.updateStatus('AI is thinking...');
      this.render();
      this.queueAiMove();
    } else {
      this.updateStatus(`${this.capitalize(this.currentPlayer)} to move`);
      this.render();
    }
  }

  isAiTurn() {
    return this.playMode === 'ai' && this.currentPlayer === this.aiColor;
  }

  queueAiMove() {
    this.isAiThinking = true;
    setTimeout(() => {
      const move = this.getBestMove(this.board, this.aiColor, this.aiDepth);
      this.isAiThinking = false;

      if (!move) {
        const winner = this.aiColor === 'red' ? 'black' : 'red';
        this.gameOver = true;
        this.updateStatus(`${this.capitalize(winner)} wins!`);
        this.render();
        return;
      }

      this.applyMoveToLiveGame(move);
    }, 250);
  }

  evaluateBoard(board, perspective) {
    let score = 0;

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = board[row][col];
        if (!piece) continue;

        const base = piece.king ? 175 : 100;
        const advanceBonus = piece.king
          ? 0
          : (piece.player === 'red' ? (this.size - 1 - row) : row) * 4;
        const centerControl = Math.max(0, 3 - Math.abs(col - (this.size - 1) / 2)) * 3;
        const value = base + advanceBonus + centerControl;

        score += piece.player === perspective ? value : -value;
      }
    }

    return score;
  }

  getBestMove(board, player, depth) {
    const moves = this.getAllMoves(board, player);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const next = this.applyMove(board, move);
      const score = this.minimax(next, depth - 1, -Infinity, Infinity, false, player);
      if (score > bestScore || (score === bestScore && Math.random() < 0.35)) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  minimax(board, depth, alpha, beta, maximizing, perspective) {
    const turn = maximizing ? perspective : this.getOpponent(perspective);
    const winner = this.getWinner(board, turn);

    if (winner || depth <= 0) {
      if (winner === perspective) return 999999;
      if (winner === this.getOpponent(perspective)) return -999999;
      return this.evaluateBoard(board, perspective);
    }

    const moves = this.getAllMoves(board, turn);
    if (moves.length === 0) return this.evaluateBoard(board, perspective);

    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const value = this.minimax(this.applyMove(board, move), depth - 1, alpha, beta, false, perspective);
        best = Math.max(best, value);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      const value = this.minimax(this.applyMove(board, move), depth - 1, alpha, beta, true, perspective);
      best = Math.min(best, value);
      beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  getWinner(board, playerToMove) {
    let red = 0;
    let black = 0;

    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const piece = board[row][col];
        if (!piece) continue;
        if (piece.player === 'red') red += 1;
        if (piece.player === 'black') black += 1;
      }
    }

    if (red === 0) return 'black';
    if (black === 0) return 'red';

    if (this.getAllMoves(board, playerToMove).length === 0) {
      return this.getOpponent(playerToMove);
    }

    return null;
  }

  getOpponent(player) {
    return player === 'red' ? 'black' : 'red';
  }

  updateStatus(text) {
    this.el.status.textContent = text;
  }

  updateTurnBadge() {
    this.el.turnBadge.textContent = `Turn: ${this.capitalize(this.currentPlayer)}`;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

const game = new CheckersGame({
  board: document.getElementById('board'),
  status: document.getElementById('status'),
  turnBadge: document.getElementById('turnBadge'),
  newGameBtn: document.getElementById('newGameBtn'),
  boardSize: document.getElementById('boardSize'),
  playMode: document.getElementById('playMode'),
  playerColor: document.getElementById('playerColor'),
  difficulty: document.getElementById('difficulty'),
  theme: document.getElementById('theme'),
});

window.game = game;
