/* ================================================================
   games.js — Games page: modal manager, Tetris, Road Racer
   ================================================================ */

(function () {
  'use strict';

  /* ---- Bootstrap ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGames);
  } else {
    initGames();
  }

  /* ================================================================
     MODAL MANAGER
     ================================================================ */

  var activeGame  = null;
  var escListener = null;

  var shelfState = { isDown: false, startX: 0, scrollLeft: 0, didDrag: false };

  function initGames() {
    var shelf    = document.getElementById('games-shelf');
    var modal    = document.getElementById('game-modal');
    var closeBtn = document.getElementById('game-modal-close');
    var canvas   = document.getElementById('game-canvas');

    if (!shelf || !modal || !canvas) return;

    initShelfDrag(shelf);

    shelf.addEventListener('click', function (e) {
      if (shelfState.didDrag) return;
      var btn = e.target.closest('.game-card__play-btn');
      if (!btn || btn.disabled) return;
      var gameId = btn.getAttribute('data-game');
      if (gameId) openGame(gameId, canvas, modal);
    });

    closeBtn.addEventListener('click', function () {
      closeGame(canvas, modal);
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeGame(canvas, modal);
    });
  }

  function initShelfDrag(shelf) {
    shelf.addEventListener('mousedown', function (e) {
      shelfState.isDown     = true;
      shelfState.didDrag    = false;
      shelfState.startX     = e.pageX - shelf.offsetLeft;
      shelfState.scrollLeft = shelf.scrollLeft;
    });
    shelf.addEventListener('mousemove', function (e) {
      if (!shelfState.isDown) return;
      e.preventDefault();
      var x    = e.pageX - shelf.offsetLeft;
      var walk = x - shelfState.startX;
      if (Math.abs(walk) > 4) shelfState.didDrag = true;
      shelf.scrollLeft = shelfState.scrollLeft - walk;
    });
    shelf.addEventListener('mouseup',    function () { shelfState.isDown = false; });
    shelf.addEventListener('mouseleave', function () { shelfState.isDown = false; });
  }

  function openGame(gameId, canvas, modal) {
    activeGame = gameId;

    /* Title */
    document.getElementById('game-modal-title').textContent =
      gameId === 'tetris' ? 'Tetris' : 'Road Racer';

    /* Level display only for Tetris */
    var levelDisplay = document.getElementById('game-level-display');
    if (levelDisplay) levelDisplay.style.display = gameId === 'tetris' ? '' : 'none';

    /* Reset score */
    var scoreEl = document.getElementById('game-score');
    var levelEl = document.getElementById('game-level');
    if (scoreEl) scoreEl.textContent = '0';
    if (levelEl) levelEl.textContent = '1';

    /* Canvas size */
    if (gameId === 'tetris') {
      canvas.width  = 240;
      canvas.height = 480;
    } else {
      canvas.width  = 320;
      canvas.height = 480;
    }

    /* Controls hint */
    var controlsEl = document.getElementById('game-controls-hint');
    if (controlsEl) {
      if (gameId === 'tetris') {
        controlsEl.innerHTML =
          '<p><kbd>←</kbd> <kbd>→</kbd> Move &nbsp;|&nbsp; ' +
          '<kbd>↑</kbd> Rotate &nbsp;|&nbsp; ' +
          '<kbd>↓</kbd> Soft drop &nbsp;|&nbsp; ' +
          '<kbd>Space</kbd> Hard drop &nbsp;|&nbsp; ' +
          '<kbd>P</kbd> Pause &nbsp;|&nbsp; <kbd>R</kbd> Restart</p>';
      } else {
        controlsEl.innerHTML =
          '<p><kbd>←</kbd> <kbd>→</kbd> Steer &nbsp;|&nbsp; ' +
          '<kbd>P</kbd> Pause &nbsp;|&nbsp; <kbd>R</kbd> Restart</p>';
      }
    }

    /* Touch controls */
    var touchEl = document.getElementById('touch-controls');
    if (touchEl) {
      if (gameId === 'tetris') {
        touchEl.innerHTML =
          '<div class="touch-row"><button class="touch-btn" data-key="ArrowUp" aria-label="Rotate">↑</button></div>' +
          '<div class="touch-row">' +
            '<button class="touch-btn" data-key="ArrowLeft" aria-label="Left">←</button>' +
            '<button class="touch-btn" data-key="ArrowDown" aria-label="Down">↓</button>' +
            '<button class="touch-btn" data-key="ArrowRight" aria-label="Right">→</button>' +
          '</div>' +
          '<div class="touch-row"><button class="touch-btn" data-key=" " aria-label="Hard drop">■</button></div>';
      } else {
        touchEl.innerHTML =
          '<div class="touch-row">' +
            '<button class="touch-btn" data-key="ArrowLeft" aria-label="Left">←</button>' +
            '<button class="touch-btn" data-key="ArrowRight" aria-label="Right">→</button>' +
          '</div>';
      }

      touchEl.querySelectorAll('.touch-btn').forEach(function (btn) {
        var key = btn.getAttribute('data-key');
        btn.addEventListener('touchstart', function (e) {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
        }, { passive: false });
        btn.addEventListener('touchend', function (e) {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true }));
        }, { passive: false });
      });
    }

    /* Open modal */
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    /* Start game */
    if (gameId === 'tetris') {
      Tetris.start(canvas);
    } else {
      Racing.start(canvas);
    }

    /* Escape to close */
    escListener = function (e) {
      if (e.key === 'Escape') closeGame(canvas, modal);
    };
    document.addEventListener('keydown', escListener);

    /* Focus close button for accessibility */
    var closeBtn = document.getElementById('game-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeGame(canvas, modal) {
    if (activeGame === 'tetris') Tetris.stop();
    else if (activeGame === 'racing') Racing.stop();

    if (escListener) {
      document.removeEventListener('keydown', escListener);
      escListener = null;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    activeGame = null;
  }

  /* ================================================================
     TETRIS
     ================================================================ */

  var Tetris = (function () {

    /* ---- Constants ---- */
    var COLS = 10, ROWS = 20, CELL = 24;

    var COLORS = [
      null,
      '#5dc7ff', /* I - cyan    */
      '#ffb562', /* O - orange  */
      '#9f7bff', /* T - purple  */
      '#4ade80', /* S - green   */
      '#f87171', /* Z - red     */
      '#60a5fa', /* J - blue    */
      '#fb923c'  /* L - lt-orng */
    ];

    /* SRS piece definitions: [rotation][mino] = [dr, dc] */
    var PIECES = {
      I: [
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,2],[1,2],[2,2],[3,2]],
        [[2,0],[2,1],[2,2],[2,3]],
        [[0,1],[1,1],[2,1],[3,1]]
      ],
      O: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]]
      ],
      T: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[1,2],[2,1]],
        [[0,1],[1,0],[1,1],[2,1]]
      ],
      S: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,1],[1,1],[1,2],[2,2]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,0],[1,0],[1,1],[2,1]]
      ],
      Z: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,2],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]]
      ],
      J: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,0],[2,1]]
      ],
      L: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[2,0]],
        [[0,0],[0,1],[1,1],[2,1]]
      ]
    };

    var PIECE_KEYS = ['I','O','T','S','Z','J','L'];
    var PIECE_IDS  = { I:1, O:2, T:3, S:4, Z:5, J:6, L:7 };

    /* ---- State ---- */
    var ctx, board, current, nextType;
    var score, level, lines, gameOver, paused;
    var dropInterval, lastDrop, animId;
    var dasLeft, dasRight, dasDown;
    var DAS_DELAY = 170, DAS_RATE = 50;
    var boundKeyDown, boundKeyUp;

    function randomType() {
      return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    }

    function makePiece(type) {
      return { type: type, rot: 0, row: 0, col: 3, cells: PIECES[type][0] };
    }

    function canPlace(cells, row, col) {
      for (var i = 0; i < cells.length; i++) {
        var r = row + cells[i][0];
        var c = col + cells[i][1];
        if (r >= ROWS) return false;
        if (c < 0 || c >= COLS) return false;
        if (r >= 0 && board[r][c] !== 0) return false;
      }
      return true;
    }

    function tryMove(dr, dc) {
      var nr = current.row + dr;
      var nc = current.col + dc;
      if (canPlace(current.cells, nr, nc)) {
        current.row = nr;
        current.col = nc;
        return true;
      }
      return false;
    }

    function tryRotate() {
      var nextRot   = (current.rot + 1) % 4;
      var newCells  = PIECES[current.type][nextRot];
      var kicks     = current.type === 'I'
        ? [0, -1, 1, -2, 2]
        : [0, -1,  1];
      for (var i = 0; i < kicks.length; i++) {
        if (canPlace(newCells, current.row, current.col + kicks[i])) {
          current.rot   = nextRot;
          current.col  += kicks[i];
          current.cells = newCells;
          return;
        }
      }
    }

    function hardDrop() {
      var dropped = 0;
      while (canPlace(current.cells, current.row + 1, current.col)) {
        current.row++;
        dropped++;
      }
      score += dropped * 2;
      lockPiece();
    }

    function lockPiece() {
      var colorIdx = PIECE_IDS[current.type];
      for (var i = 0; i < current.cells.length; i++) {
        var r = current.row + current.cells[i][0];
        var c = current.col + current.cells[i][1];
        if (r >= 0) board[r][c] = colorIdx;
      }
      clearLines();
      spawnNext();
    }

    function clearLines() {
      var cleared = 0;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(function (v) { return v !== 0; })) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++; /* re-check same index */
        }
      }
      if (cleared > 0) {
        var pts = [0, 100, 300, 500, 800][cleared] * level;
        score += pts;
        lines += cleared;
        level  = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(80, 800 - (level - 1) * 70);
        updateHUD();
      }
    }

    function spawnNext() {
      current  = makePiece(nextType);
      nextType = randomType();
      if (!canPlace(current.cells, current.row, current.col)) {
        gameOver = true;
      }
    }

    function ghostRow() {
      var gr = current.row;
      while (canPlace(current.cells, gr + 1, current.col)) gr++;
      return gr;
    }

    function updateHUD() {
      var scoreEl = document.getElementById('game-score');
      var levelEl = document.getElementById('game-level');
      if (scoreEl) scoreEl.textContent = score;
      if (levelEl) levelEl.textContent = level;
    }

    /* ---- Rendering ---- */

    function fillCell(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      /* top/left highlight */
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + 1, y + 1, CELL - 2, 2);
      ctx.fillRect(x + 1, y + 1, 2, CELL - 2);
      /* bottom/right shadow */
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 1, y + CELL - 3, CELL - 2, 2);
      ctx.fillRect(x + CELL - 3, y + 1, 2, CELL - 2);
    }

    function draw() {
      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

      /* Background */
      ctx.fillStyle = '#12131f';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      /* Grid lines */
      ctx.strokeStyle = 'rgba(235,237,255,0.05)';
      ctx.lineWidth = 1;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
      }

      /* Locked cells */
      for (var row = 0; row < ROWS; row++) {
        for (var col = 0; col < COLS; col++) {
          if (board[row][col] !== 0) {
            fillCell(col * CELL, row * CELL, COLORS[board[row][col]]);
          }
        }
      }

      /* Ghost piece */
      var gr = ghostRow();
      if (gr !== current.row) {
        var ghostColor = COLORS[PIECE_IDS[current.type]];
        ctx.globalAlpha = 0.22;
        for (var i = 0; i < current.cells.length; i++) {
          var gc = current.col + current.cells[i][1];
          var gro = gr + current.cells[i][0];
          if (gro >= 0) fillCell(gc * CELL, gro * CELL, ghostColor);
        }
        ctx.globalAlpha = 1;
      }

      /* Current piece */
      var pieceColor = COLORS[PIECE_IDS[current.type]];
      for (var j = 0; j < current.cells.length; j++) {
        var pr = current.row + current.cells[j][0];
        var pc = current.col + current.cells[j][1];
        if (pr >= 0) fillCell(pc * CELL, pr * CELL, pieceColor);
      }

      /* Pause overlay */
      if (paused) {
        ctx.fillStyle = 'rgba(18,19,31,0.7)';
        ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
        ctx.font = '600 18px Inter, sans-serif';
        ctx.fillStyle = '#f4f4f9';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', COLS * CELL / 2, ROWS * CELL / 2);
        ctx.font = '400 12px Inter, sans-serif';
        ctx.fillStyle = '#b8bdd3';
        ctx.fillText('Press P to resume', COLS * CELL / 2, ROWS * CELL / 2 + 24);
      }
    }

    function drawGameOver() {
      ctx.fillStyle = 'rgba(18,19,31,0.84)';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.textAlign = 'center';
      ctx.font = '700 22px Inter, sans-serif';
      ctx.fillStyle = '#ffb562';
      ctx.fillText('GAME OVER', COLS * CELL / 2, ROWS * CELL / 2 - 20);
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillStyle = '#b8bdd3';
      ctx.fillText('Score: ' + score, COLS * CELL / 2, ROWS * CELL / 2 + 8);
      ctx.fillText('Press R to restart', COLS * CELL / 2, ROWS * CELL / 2 + 30);
    }

    /* ---- DAS (Delayed Auto-Shift) ---- */

    var dasState = { leftTs: 0, rightTs: 0, downTs: 0 };

    function handleDAS(ts) {
      if (dasLeft && ts - dasState.leftTs > DAS_DELAY) {
        if ((ts - dasState.leftTs - DAS_DELAY) % DAS_RATE < 20) tryMove(0, -1);
      }
      if (dasRight && ts - dasState.rightTs > DAS_DELAY) {
        if ((ts - dasState.rightTs - DAS_DELAY) % DAS_RATE < 20) tryMove(0, 1);
      }
      if (dasDown && ts - dasState.downTs > DAS_DELAY) {
        if ((ts - dasState.downTs - DAS_DELAY) % DAS_RATE < 20) {
          if (tryMove(1, 0)) score++;
        }
      }
    }

    /* ---- Game loop ---- */

    function gameLoop(ts) {
      if (gameOver) { drawGameOver(); return; }
      if (!paused) {
        handleDAS(ts);
        if (ts - lastDrop > dropInterval) {
          if (!tryMove(1, 0)) {
            lockPiece();
            updateHUD();
          }
          lastDrop = ts;
        }
        draw();
      }
      animId = requestAnimationFrame(gameLoop);
    }

    /* ---- Keyboard handlers ---- */

    function onKeyDown(e) {
      if (gameOver) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!dasLeft) { tryMove(0, -1); dasLeft = true; dasState.leftTs = performance.now(); }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!dasRight) { tryMove(0, 1); dasRight = true; dasState.rightTs = performance.now(); }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!dasDown) { if (tryMove(1, 0)) score++; dasDown = true; dasState.downTs = performance.now(); }
          break;
        case 'ArrowUp':
          e.preventDefault();
          tryRotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          updateHUD();
          break;
        case 'p': case 'P':
          paused = !paused;
          if (!paused) lastDrop = performance.now();
          break;
        case 'r': case 'R':
          restart();
          break;
      }
    }

    function onKeyUp(e) {
      switch (e.key) {
        case 'ArrowLeft':  dasLeft  = false; break;
        case 'ArrowRight': dasRight = false; break;
        case 'ArrowDown':  dasDown  = false; break;
      }
    }

    /* ---- Public API ---- */

    function reset() {
      board    = [];
      for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(0));
      score    = 0;
      level    = 1;
      lines    = 0;
      gameOver = false;
      paused   = false;
      dropInterval = 800;
      lastDrop     = performance.now();
      dasLeft = dasRight = dasDown = false;
      nextType = randomType();
      current  = makePiece(randomType());
      updateHUD();
    }

    function restart() {
      if (animId) cancelAnimationFrame(animId);
      reset();
      animId = requestAnimationFrame(gameLoop);
    }

    function start(canvas) {
      ctx = canvas.getContext('2d');
      reset();
      boundKeyDown = onKeyDown;
      boundKeyUp   = onKeyUp;
      document.addEventListener('keydown', boundKeyDown);
      document.addEventListener('keyup',   boundKeyUp);
      animId = requestAnimationFrame(gameLoop);
    }

    function stop() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      if (boundKeyDown) { document.removeEventListener('keydown', boundKeyDown); boundKeyDown = null; }
      if (boundKeyUp)   { document.removeEventListener('keyup',   boundKeyUp);   boundKeyUp   = null; }
    }

    return { start: start, stop: stop };

  }());

  /* ================================================================
     ROAD RACER
     ================================================================ */

  var Racing = (function () {

    /* ---- Constants ---- */
    var W = 320, H = 480;
    var ROAD_LEFT  = 80,
        ROAD_RIGHT = 240,
        ROAD_W     = 160;
    var CAR_W = 36, CAR_H = 56;
    var PLAYER_SPEED = 3.5;
    var OBS_W = 34, OBS_H = 52;
    var OBS_COLORS = ['#f87171', '#4ade80', '#fb923c'];

    /* ---- State ---- */
    var ctx;
    var playerX, speed, score, distance, gameOver, paused;
    var obstacles, dashOffset, frameCount, spawnCountdown;
    var keys;
    var animId, boundKeyDown, boundKeyUp;

    function reset() {
      playerX       = ROAD_W / 2 - CAR_W / 2;
      speed         = 2;
      score         = 0;
      distance      = 0;
      gameOver      = false;
      paused        = false;
      obstacles     = [];
      dashOffset    = 0;
      frameCount    = 0;
      spawnCountdown = 60;
      keys          = { left: false, right: false };
    }

    /* ---- Drawing helpers ---- */

    function drawRoad() {
      /* Sky */
      ctx.fillStyle = '#0e0f1c';
      ctx.fillRect(0, 0, W, H);

      /* Grass */
      ctx.fillStyle = '#162415';
      ctx.fillRect(0, 0, ROAD_LEFT, H);
      ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);

      /* Grass edge strips */
      ctx.fillStyle = '#1e3220';
      ctx.fillRect(ROAD_LEFT - 8, 0, 8, H);
      ctx.fillRect(ROAD_RIGHT, 0, 8, H);

      /* Road surface */
      ctx.fillStyle = '#2a2b3d';
      ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

      /* Road edges */
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ROAD_LEFT, 0, 3, H);
      ctx.fillRect(ROAD_RIGHT - 3, 0, 3, H);

      /* Centre dashes */
      var cx = ROAD_LEFT + ROAD_W / 2 - 1;
      dashOffset = (dashOffset + speed) % 40;
      for (var y = -40 + dashOffset; y < H; y += 40) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(cx, y, 2, 22);
      }
    }

    function drawPlayerCar(x, y) {
      var rx = ROAD_LEFT + x;
      /* Body */
      ctx.fillStyle = '#9f7bff';
      roundRect(ctx, rx, y, CAR_W, CAR_H, 4);
      ctx.fill();
      /* Windshield */
      ctx.fillStyle = 'rgba(93,199,255,0.7)';
      ctx.fillRect(rx + 4, y + 7, CAR_W - 8, 12);
      /* Rear window */
      ctx.fillStyle = 'rgba(93,199,255,0.45)';
      ctx.fillRect(rx + 4, y + 34, CAR_W - 8, 9);
      /* Wheels */
      ctx.fillStyle = '#12131f';
      ctx.fillRect(rx - 4, y + 9,  8, 12);
      ctx.fillRect(rx + CAR_W - 4, y + 9,  8, 12);
      ctx.fillRect(rx - 4, y + 33, 8, 12);
      ctx.fillRect(rx + CAR_W - 4, y + 33, 8, 12);
      /* Wheel highlights */
      ctx.fillStyle = '#3a3b50';
      ctx.fillRect(rx - 3, y + 10, 3, 10);
      ctx.fillRect(rx + CAR_W + 1, y + 10, 3, 10);
      ctx.fillRect(rx - 3, y + 34, 3, 10);
      ctx.fillRect(rx + CAR_W + 1, y + 34, 3, 10);
    }

    function drawObsCar(obs) {
      /* Body */
      ctx.fillStyle = obs.color;
      roundRect(ctx, obs.x, obs.y, OBS_W, OBS_H, 4);
      ctx.fill();
      /* Windshield (bottom since coming toward player) */
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(obs.x + 4, obs.y + OBS_H - 18, OBS_W - 8, 12);
      /* Top window */
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(obs.x + 4, obs.y + 5, OBS_W - 8, 9);
      /* Wheels */
      ctx.fillStyle = '#12131f';
      ctx.fillRect(obs.x - 4, obs.y + 9,  7, 11);
      ctx.fillRect(obs.x + OBS_W - 3, obs.y + 9,  7, 11);
      ctx.fillRect(obs.x - 4, obs.y + OBS_H - 20, 7, 11);
      ctx.fillRect(obs.x + OBS_W - 3, obs.y + OBS_H - 20, 7, 11);
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    /* ---- Game logic ---- */

    function spawnObstacle() {
      var lane  = Math.floor(Math.random() * 3); /* 0,1,2 */
      var laneW = ROAD_W / 3;
      var ox    = ROAD_LEFT + lane * laneW + (laneW - OBS_W) / 2;
      obstacles.push({
        x:     ox,
        y:     -OBS_H,
        color: OBS_COLORS[Math.floor(Math.random() * OBS_COLORS.length)]
      });
    }

    function checkCollision() {
      var px = ROAD_LEFT + playerX + 4;
      var py = H - CAR_H - 20 + 4;
      var pw = CAR_W - 8;
      var ph = CAR_H - 8;
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (px < o.x + OBS_W - 4 &&
            px + pw > o.x + 4 &&
            py < o.y + OBS_H - 4 &&
            py + ph > o.y + 4) {
          gameOver = true;
          return;
        }
      }
    }

    function updateHUD() {
      var scoreEl = document.getElementById('game-score');
      if (scoreEl) scoreEl.textContent = score;
    }

    function drawGameOver() {
      ctx.fillStyle = 'rgba(14,15,28,0.86)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.font = '700 22px Inter, sans-serif';
      ctx.fillStyle = '#ffb562';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
      ctx.font = '400 14px Inter, sans-serif';
      ctx.fillStyle = '#b8bdd3';
      ctx.fillText('Distance: ' + score, W / 2, H / 2 + 8);
      ctx.fillText('Press R to restart', W / 2, H / 2 + 30);
    }

    function drawPaused() {
      ctx.fillStyle = 'rgba(14,15,28,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillStyle = '#f4f4f9';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.font = '400 12px Inter, sans-serif';
      ctx.fillStyle = '#b8bdd3';
      ctx.fillText('Press P to resume', W / 2, H / 2 + 24);
    }

    /* ---- Game loop ---- */

    function racingLoop() {
      if (gameOver) { drawGameOver(); return; }

      if (!paused) {
        /* Player movement */
        if (keys.left)  playerX = Math.max(0, playerX - PLAYER_SPEED);
        if (keys.right) playerX = Math.min(ROAD_W - CAR_W, playerX + PLAYER_SPEED);

        /* Scroll obstacles */
        for (var i = 0; i < obstacles.length; i++) obstacles[i].y += speed;
        obstacles = obstacles.filter(function (o) { return o.y < H + OBS_H; });

        /* Spawn */
        spawnCountdown--;
        if (spawnCountdown <= 0) {
          spawnObstacle();
          spawnCountdown = Math.max(28, Math.round(90 - Math.floor(score / 200) * 5));
        }

        /* Collision */
        checkCollision();

        /* Score */
        distance += speed;
        score = Math.floor(distance / 10);
        speed = Math.min(8, 2 + Math.floor(score / 500) * 0.5);
        frameCount++;
        if (frameCount % 6 === 0) updateHUD();

        /* Draw */
        drawRoad();
        for (var j = 0; j < obstacles.length; j++) drawObsCar(obstacles[j]);
        drawPlayerCar(playerX, H - CAR_H - 20);
      } else {
        drawPaused();
      }

      animId = requestAnimationFrame(racingLoop);
    }

    /* ---- Keyboard ---- */

    function onKeyDown(e) {
      if (gameOver) {
        if (e.key === 'r' || e.key === 'R') restart();
        return;
      }
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); keys.left  = true; break;
        case 'ArrowRight': e.preventDefault(); keys.right = true; break;
        case 'p': case 'P': paused = !paused; break;
        case 'r': case 'R': restart(); break;
      }
    }

    function onKeyUp(e) {
      switch (e.key) {
        case 'ArrowLeft':  keys.left  = false; break;
        case 'ArrowRight': keys.right = false; break;
      }
    }

    /* ---- Public API ---- */

    function restart() {
      if (animId) cancelAnimationFrame(animId);
      reset();
      animId = requestAnimationFrame(racingLoop);
    }

    function start(canvas) {
      ctx = canvas.getContext('2d');
      reset();
      boundKeyDown = onKeyDown;
      boundKeyUp   = onKeyUp;
      document.addEventListener('keydown', boundKeyDown);
      document.addEventListener('keyup',   boundKeyUp);
      animId = requestAnimationFrame(racingLoop);
    }

    function stop() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      if (boundKeyDown) { document.removeEventListener('keydown', boundKeyDown); boundKeyDown = null; }
      if (boundKeyUp)   { document.removeEventListener('keyup',   boundKeyUp);   boundKeyUp   = null; }
    }

    return { start: start, stop: stop };

  }());

}());
