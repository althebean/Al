class AdAdapter {
  initialize(providerConfig = {}) {
    this.provider = providerConfig.provider ?? 'none';
  }
  showInterstitial(placement = 'default') { console.info(`[AdAdapter] interstitial: ${placement}`); }
  showRewarded(placement = 'reward-default') { console.info(`[AdAdapter] rewarded: ${placement}`); }
}

class CheckersGame {
  constructor(app) { this.app = app; }

  start() {
    this.size = Number(this.app.el.boardSize.value);
    this.current = 'red';
    this.selected = null;
    this.legal = [];
    this.board = this.createBoard();
    this.app.setRule('Forced captures: ON');
    this.render();
    this.app.setTurn(this.current);
    this.app.setStatus(`${this.cap(this.current)} to move`);
    if (this.app.isAiTurn(this.current)) this.app.queueAi();
  }

  createBoard() {
    const b = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    const rowsPerSide = this.size / 2 - 1;
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        if ((r + c) % 2 === 0) continue;
        if (r < rowsPerSide) b[r][c] = { p: 'black', k: false };
        if (r >= this.size - rowsPerSide) b[r][c] = { p: 'red', k: false };
      }
    }
    return b;
  }

  render() {
    const boardEl = this.app.el.board;
    boardEl.className = 'board';
    boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
    boardEl.innerHTML = '';
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        const cell = document.createElement('button');
        cell.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        if (this.selected && this.selected.r === r && this.selected.c === c) cell.classList.add('selected');
        if (this.legal.some((m) => m.to.r === r && m.to.c === c)) cell.classList.add('target');
        cell.addEventListener('click', () => this.onClick(r, c));

        const piece = this.board[r][c];
        if (piece) {
          const p = document.createElement('div');
          p.className = `piece ${piece.p}${piece.k ? ' king' : ''}`;
          cell.appendChild(p);
        }
        boardEl.appendChild(cell);
      }
    }
  }

  dirs(piece) {
    if (piece.k) return [[1,1],[1,-1],[-1,1],[-1,-1]];
    return piece.p === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  }
  in(r,c){ return r>=0&&r<this.size&&c>=0&&c<this.size; }

  pieceMoves(board, r, c, captureOnly=false) {
    const piece = board[r][c]; if (!piece) return [];
    const out = [];
    for (const [dr,dc] of this.dirs(piece)) {
      const sr=r+dr, sc=c+dc, jr=r+dr*2, jc=c+dc*2;
      if (this.in(sr,sc) && !captureOnly && board[sr][sc]===null) out.push({from:{r,c},to:{r:sr,c:sc},cap:null});
      if (this.in(jr,jc) && board[jr][jc]===null && board[sr][sc] && board[sr][sc].p!==piece.p) out.push({from:{r,c},to:{r:jr,c:jc},cap:{r:sr,c:sc}});
    }
    return captureOnly ? out.filter((m)=>m.cap) : out;
  }

  allMoves(board, player) {
    const captures=[]; const normals=[];
    for (let r=0;r<this.size;r+=1) for (let c=0;c<this.size;c+=1) {
      const p=board[r][c]; if (!p||p.p!==player) continue;
      for (const m of this.pieceMoves(board,r,c,false)) (m.cap?captures:normals).push(m);
    }
    return captures.length?captures:normals;
  }

  onClick(r,c) {
    if (this.app.busy || this.app.isAiTurn(this.current)) return;
    const all = this.allMoves(this.board,this.current);
    const piece = this.board[r][c];
    if (piece && piece.p===this.current) {
      const candidate = all.filter((m)=>m.from.r===r && m.from.c===c);
      if (candidate.length) { this.selected={r,c}; this.legal=candidate; this.render(); }
      return;
    }
    const mv = this.legal.find((m)=>m.to.r===r && m.to.c===c);
    if (mv) this.applyLive(mv);
  }

  clone(board){ return board.map((row)=>row.map((x)=>x?{...x}:null)); }
  apply(board, mv) {
    const b=this.clone(board); const p=b[mv.from.r][mv.from.c];
    b[mv.from.r][mv.from.c]=null; b[mv.to.r][mv.to.c]=p;
    if (mv.cap) b[mv.cap.r][mv.cap.c]=null;
    if ((p.p==='red'&&mv.to.r===0)||(p.p==='black'&&mv.to.r===this.size-1)) p.k=true;
    return b;
  }

  applyLive(mv) {
    this.board = this.apply(this.board,mv);
    if (mv.cap) {
      const chain = this.pieceMoves(this.board,mv.to.r,mv.to.c,true);
      if (chain.length) {
        if (this.app.isAiTurn(this.current)) {
          this.applyLive(chain[Math.floor(Math.random()*chain.length)]);
          return;
        }
        this.selected={r:mv.to.r,c:mv.to.c}; this.legal=chain; this.render();
        this.app.setStatus(`${this.cap(this.current)} continues capture chain`);
        return;
      }
    }
    this.finishTurn();
  }

  finishTurn() {
    this.current = this.current === 'red' ? 'black' : 'red';
    this.selected=null; this.legal=[];
    const winner = this.getWinner(this.board,this.current);
    if (winner) {
      this.app.setStatus(`${this.cap(winner)} wins!`);
      this.app.setTurn(winner);
      this.app.gameOver = true;
      this.app.ad.showInterstitial('match_end');
      this.render();
      return;
    }
    this.app.setTurn(this.current);
    this.app.setStatus(this.app.isAiTurn(this.current) ? 'AI is thinking...' : `${this.cap(this.current)} to move`);
    this.render();
    if (this.app.isAiTurn(this.current)) this.app.queueAi();
  }

  getWinner(board, toMove) {
    let red=0, black=0;
    for (const row of board) for (const p of row) { if (!p) continue; if (p.p==='red') red+=1; else black+=1; }
    if (!red) return 'black'; if (!black) return 'red';
    if (!this.allMoves(board,toMove).length) return toMove==='red'?'black':'red';
    return null;
  }

  evaluate(board, side) {
    let score=0;
    for (let r=0;r<this.size;r+=1) for (let c=0;c<this.size;c+=1) {
      const p=board[r][c]; if (!p) continue;
      const val=(p.k?175:100)+(!p.k?(p.p==='red'?(this.size-r):r)*3:0);
      score += p.p===side ? val : -val;
    }
    return score;
  }

  aiMove(depth) {
    const side=this.current;
    const moves=this.allMoves(this.board,side);
    if (!moves.length) return null;
    let best=moves[0], bestScore=-Infinity;
    for (const mv of moves) {
      const score=this.minimax(this.apply(this.board,mv),depth-1,-Infinity,Infinity,false,side);
      if (score>bestScore || (score===bestScore&&Math.random()<0.3)) { best=mv; bestScore=score; }
    }
    return best;
  }

  minimax(board, depth, alpha, beta, maxing, perspective) {
    const turn=maxing?perspective:(perspective==='red'?'black':'red');
    const winner=this.getWinner(board,turn);
    if (winner||depth<=0) return winner===perspective?99999:winner?-99999:this.evaluate(board,perspective);
    const moves=this.allMoves(board,turn);
    if (!moves.length) return this.evaluate(board,perspective);
    if (maxing) {
      let val=-Infinity;
      for (const mv of moves) { val=Math.max(val,this.minimax(this.apply(board,mv),depth-1,alpha,beta,false,perspective)); alpha=Math.max(alpha,val); if (beta<=alpha) break; }
      return val;
    }
    let val=Infinity;
    for (const mv of moves) { val=Math.min(val,this.minimax(this.apply(board,mv),depth-1,alpha,beta,true,perspective)); beta=Math.min(beta,val); if (beta<=alpha) break; }
    return val;
  }

  cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
}

class TicTacToeGame {
  constructor(app){ this.app=app; }
  start() {
    this.current='red'; this.board=Array(9).fill(null);
    this.app.setRule('3 in a row wins');
    this.render(); this.app.setTurn('red'); this.app.setStatus('X to move');
    if (this.app.isAiTurn(this.current)) this.app.queueAi();
  }
  render() {
    const b=this.app.el.board; b.className='board ttt'; b.style.gridTemplateColumns='repeat(3,1fr)'; b.innerHTML='';
    for (let i=0;i<9;i+=1){
      const c=document.createElement('button'); c.className='square ttt-cell';
      if (this.board[i]==='red'){ c.textContent='X'; c.classList.add('x'); }
      if (this.board[i]==='black'){ c.textContent='O'; c.classList.add('o'); }
      c.addEventListener('click',()=>this.onClick(i)); b.appendChild(c);
    }
  }
  onClick(i){
    if (this.app.busy||this.app.isAiTurn(this.current)||this.board[i]||this.app.gameOver) return;
    this.board[i]=this.current; this.finish();
  }
  winner(board=this.board){
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of lines) if (board[a]&&board[a]===board[b]&&board[b]===board[c]) return board[a];
    return board.includes(null)?null:'draw';
  }
  finish(){
    const w=this.winner(); this.render();
    if (w){ this.app.gameOver=true; this.app.setStatus(w==='draw'?'Draw game':`${w==='red'?'X':'O'} wins!`); if(w!=='draw')this.app.ad.showInterstitial('match_end'); return; }
    this.current=this.current==='red'?'black':'red'; this.app.setTurn(this.current); this.app.setStatus(this.app.isAiTurn(this.current)?'AI is thinking...':`${this.current==='red'?'X':'O'} to move`);
    if (this.app.isAiTurn(this.current)) this.app.queueAi();
  }
  aiMove(depth){
    if (depth<=1) { const empty=this.board.map((v,i)=>v===null?i:-1).filter((i)=>i>=0); return empty[Math.floor(Math.random()*empty.length)] ?? null; }
    const ai=this.current; const human=ai==='red'?'black':'red';
    const score=(b)=>{ const w=this.winner(b); if(w===ai) return 10; if(w===human) return -10; return 0; };
    const mm=(b,maxing)=>{ const sc=score(b); if(sc||!b.includes(null)) return sc;
      if(maxing){ let best=-Infinity; for(let i=0;i<9;i+=1) if(!b[i]){ b[i]=ai; best=Math.max(best,mm(b,false)); b[i]=null; } return best; }
      let best=Infinity; for(let i=0;i<9;i+=1) if(!b[i]){ b[i]=human; best=Math.min(best,mm(b,true)); b[i]=null; } return best;
    };
    let best=-Infinity, move=null;
    for(let i=0;i<9;i+=1) if(!this.board[i]){ this.board[i]=ai; const val=mm(this.board,false); this.board[i]=null; if(val>best){best=val; move=i;} }
    return move;
  }
  applyAi(m){ if (m===null||this.board[m]) return; this.board[m]=this.current; this.finish(); }
}

class ConnectFourGame {
  constructor(app){ this.app=app; }
  start() {
    this.rows=6; this.cols=7; this.current='red';
    this.board=Array.from({length:this.rows},()=>Array(this.cols).fill(null));
    this.app.setRule('Connect 4 discs to win');
    this.render(); this.app.setTurn('red'); this.app.setStatus('Red to drop');
    if (this.app.isAiTurn(this.current)) this.app.queueAi();
  }
  render(){
    const b=this.app.el.board; b.className='board connect4'; b.style.gridTemplateColumns=`repeat(${this.cols},1fr)`; b.innerHTML='';
    for(let r=0;r<this.rows;r+=1) for(let c=0;c<this.cols;c+=1){
      const slot=document.createElement('button'); slot.className='square connect-slot'; slot.addEventListener('click',()=>this.onColumn(c));
      const d=document.createElement('div'); d.className=`disc${this.board[r][c]?` ${this.board[r][c]}`:''}`; slot.appendChild(d);
      b.appendChild(slot);
    }
  }
  onColumn(c){ if(this.app.busy||this.app.isAiTurn(this.current)||this.app.gameOver) return; this.drop(c); }
  nextRow(c){ for(let r=this.rows-1;r>=0;r-=1) if(!this.board[r][c]) return r; return -1; }
  drop(c){ const r=this.nextRow(c); if(r<0) return; this.board[r][c]=this.current; this.finish(); }
  winner(){
    const b=this.board, dirs=[[1,0],[0,1],[1,1],[1,-1]];
    for(let r=0;r<this.rows;r+=1) for(let c=0;c<this.cols;c+=1){ const p=b[r][c]; if(!p) continue;
      for(const[d1,d2] of dirs){ let n=1; while(n<4){ const rr=r+d1*n, cc=c+d2*n; if(rr<0||rr>=this.rows||cc<0||cc>=this.cols||b[rr][cc]!==p) break; n+=1; }
        if(n===4) return p; }
    }
    return b.every((row)=>row.every(Boolean))?'draw':null;
  }
  finish(){
    const w=this.winner(); this.render();
    if(w){ this.app.gameOver=true; this.app.setStatus(w==='draw'?'Draw game':`${w==='red'?'Red':'Yellow'} wins!`); if(w!=='draw')this.app.ad.showInterstitial('match_end'); return; }
    this.current=this.current==='red'?'black':'red'; this.app.setTurn(this.current); this.app.setStatus(this.app.isAiTurn(this.current)?'AI is thinking...':`${this.current==='red'?'Red':'Yellow'} to drop`);
    if(this.app.isAiTurn(this.current)) this.app.queueAi();
  }
  aiMove(depth){
    const legal=[]; for(let c=0;c<this.cols;c+=1) if(this.nextRow(c)>=0) legal.push(c);
    if(!legal.length) return null;
    if(depth<=1) return legal[Math.floor(Math.random()*legal.length)];
    // quick tactical: winning move else block else center preference
    for(const c of legal){ const r=this.nextRow(c); this.board[r][c]=this.current; if(this.winner()===this.current){ this.board[r][c]=null; return c; } this.board[r][c]=null; }
    const opp=this.current==='red'?'black':'red';
    for(const c of legal){ const r=this.nextRow(c); this.board[r][c]=opp; if(this.winner()===opp){ this.board[r][c]=null; return c; } this.board[r][c]=null; }
    legal.sort((a,b)=>Math.abs(3-a)-Math.abs(3-b)); return legal[0];
  }
  applyAi(c){ if(c===null) return; this.drop(c); }
}

class BoardArenaApp {
  constructor() {
    this.el = {
      board: document.getElementById('board'),
      status: document.getElementById('status'),
      turn: document.getElementById('turnBadge'),
      rule: document.getElementById('ruleBadge'),
      legend: document.getElementById('legend'),
      newGameBtn: document.getElementById('newGameBtn'),
      gameType: document.getElementById('gameType'),
      playMode: document.getElementById('playMode'),
      playerColor: document.getElementById('playerColor'),
      difficulty: document.getElementById('difficulty'),
      boardSize: document.getElementById('boardSize'),
      checkersOnly: document.getElementById('checkersOnly'),
      theme: document.getElementById('theme'),
    };
    this.ad = new AdAdapter();
    this.ad.initialize({ provider: 'none' });
    this.games = {
      checkers: new CheckersGame(this),
      tictactoe: new TicTacToeGame(this),
      connect4: new ConnectFourGame(this),
    };
    this.bind();
    this.start();
  }

  bind() {
    this.el.newGameBtn.addEventListener('click', () => this.start());
    for (const id of ['gameType','playMode','playerColor','difficulty','boardSize']) {
      this.el[id].addEventListener('change', () => this.start());
    }
    this.el.theme.addEventListener('change', () => {
      document.body.classList.toggle('midnight', this.el.theme.value === 'midnight');
    });
  }

  start() {
    this.gameOver = false;
    this.busy = false;
    this.activeType = this.el.gameType.value;
    this.humanColor = this.el.playerColor.value;
    this.aiColor = this.humanColor === 'red' ? 'black' : 'red';
    this.depth = Number(this.el.difficulty.value);
    this.el.checkersOnly.classList.toggle('hidden', this.activeType !== 'checkers');
    this.renderLegend();
    this.games[this.activeType].start();
  }

  isAiTurn(side) { return this.el.playMode.value === 'ai' && side === this.aiColor; }
  queueAi() {
    this.busy = true;
    setTimeout(() => {
      const game = this.games[this.activeType];
      const move = game.aiMove(this.depth);
      this.busy = false;
      if (this.activeType === 'checkers') {
        if (!move) { this.gameOver = true; this.setStatus('No legal AI moves. You win!'); return; }
        game.applyLive(move);
        return;
      }
      game.applyAi(move);
    }, 280);
  }

  renderLegend() {
    const legends = {
      checkers: '<span class="pill"><span class="dot red"></span> Red</span><span class="pill"><span class="dot black"></span> Black</span><span class="pill"><span class="dot king"></span> King</span>',
      tictactoe: '<span class="pill"><span class="dot red"></span> X</span><span class="pill"><span class="dot blue"></span> O</span>',
      connect4: '<span class="pill"><span class="dot red"></span> Red disc</span><span class="pill"><span class="dot yellow"></span> Yellow disc</span>',
    };
    this.el.legend.innerHTML = legends[this.activeType];
  }

  setStatus(t) { this.el.status.textContent = t; }
  setTurn(side) { this.el.turn.textContent = `Turn: ${side === 'red' ? 'Red / X' : 'Black / O / Yellow'}`; }
  setRule(t) { this.el.rule.textContent = `Ruleset: ${t}`; }
}

window.app = new BoardArenaApp();
