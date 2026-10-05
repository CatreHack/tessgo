// TESSGO - app.js (modificado para reglas solicitadas)
// Reglas implementadas:
// - Cada jugador tiene 18 fichas.
// - Secuencia por pareja: quien coloca, el oponente tira dados para intentar comer esa ficha, luego coloca.
// - Comer por dados = 1 punto (la ficha es removida del juego).
// - Rodear fichas = 2 puntos por ficha rodeada (modo "rodeo" requiere rodeo interior; modo "encerrado" permite borde como cierre).
// - El juego termina cuando se acaban las 36 colocaciones.

const gameState = {
    currentPlayer: 1,
    gameStarted: false,
    gameEnded: false,
    board: Array(6).fill(null).map(() => Array(6).fill(null)),
    players: {
        1: { pieces: 18, captures: 0, score: 0, color: 'player1' },
        2: { pieces: 18, captures: 0, score: 0, color: 'player2' }
    },
    diceResult: { number: null, letter: null },
    firstTurn: true,
    turnPhase: 'place', // 'roll' o 'place'
    isRolling: false,
    isPlacing: false,
    mode: 'rodeo' // 'rodeo' o 'encerrado' - elegido en UI
};

const config = {
    columns: ['A','B','C','D','E','F'],
    rows: [1,2,3,4,5,6],
    numberDie: [1,2,3,4,5,6],
    letterDie: ['A','B','C','D','E','F']
};

const elements = {
    startScreen: document.getElementById('startScreen'),
    gameScreen: document.getElementById('gameScreen'),
    startGameBtn: document.getElementById('startGameBtn'),
    gameBoard: document.getElementById('gameBoard'),
    rollDiceBtn: document.getElementById('rollDiceBtn'),
    numberResult: document.getElementById('numberResult'),
    letterResult: document.getElementById('letterResult'),
    diceResult: document.getElementById('diceResult'),
    turnIndicator: document.getElementById('turnIndicator'),
    phaseIndicator: document.getElementById('phaseIndicator'),
    gameMessage: document.getElementById('gameMessage'),
    player1Card: document.getElementById('player1Card'),
    player2Card: document.getElementById('player2Card'),
    player1Pieces: document.getElementById('player1Pieces'),
    player2Pieces: document.getElementById('player2Pieces'),
    player1Captures: document.getElementById('player1Captures'),
    player2Captures: document.getElementById('player2Captures'),
    newGameBtn: document.getElementById('newGameBtn'),
    victoryModal: document.getElementById('victoryModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    victoryTitle: document.getElementById('victoryTitle'),
    victoryMessage: document.getElementById('victoryMessage'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modeSelect: document.getElementById('modeSelect')
};

document.addEventListener('DOMContentLoaded', () => initializeGame());

function initializeGame(){
    if (!elements) return;
    if (elements.startGameBtn){
        elements.startGameBtn.removeEventListener('click', startGame);
        elements.startGameBtn.addEventListener('click', startGame);
    }
    if (elements.rollDiceBtn){
        elements.rollDiceBtn.removeEventListener('click', rollDice);
        elements.rollDiceBtn.addEventListener('click', rollDice);
    }
    if (elements.newGameBtn){
        elements.newGameBtn.removeEventListener('click', showStartScreen);
        elements.newGameBtn.addEventListener('click', showStartScreen);
    }
    if (elements.playAgainBtn){
        elements.playAgainBtn.removeEventListener('click', () => { hideVictoryModal(); startGame(); });
        elements.playAgainBtn.addEventListener('click', () => { hideVictoryModal(); startGame(); });
    }
    if (elements.closeModalBtn){
        elements.closeModalBtn.removeEventListener('click', hideVictoryModal);
        elements.closeModalBtn.addEventListener('click', hideVictoryModal);
    }
    if (elements.modeSelect){
        elements.modeSelect.removeEventListener('change', handleModeChange);
        elements.modeSelect.addEventListener('change', handleModeChange);
    }
    createBoard();
    updateUI();
}

function handleModeChange(){
    const val = elements.modeSelect ? elements.modeSelect.value : 'rodeo';
    gameState.mode = val;
}

function createBoard(){
    if (!elements.gameBoard) return;
    elements.gameBoard.innerHTML = '';
    for (let row=0; row<6; row++){
        for (let col=0; col<6; col++){
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.coordinate = `${config.columns[col]}${row+1}`;
            // click handler
            cell.clickHandler = () => handleCellClick(row,col);
            cell.removeEventListener('click', cell.clickHandler);
            cell.addEventListener('click', cell.clickHandler);
            // keyboard support
            cell.keydownHandler = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cell.clickHandler(); } };
            cell.removeEventListener('keydown', cell.keydownHandler);
            cell.addEventListener('keydown', cell.keydownHandler);
            cell.setAttribute('role','button');
            cell.setAttribute('tabindex','0');
            cell.setAttribute('aria-label', `Casilla ${config.columns[col]}${row+1}`);
            elements.gameBoard.appendChild(cell);
        }
    }
}

function handleCellClick(row,col){
    if (gameState.isPlacing) return;
    placePiece(row,col);
}

function startGame(){
    // set mode
    if (elements.modeSelect) gameState.mode = elements.modeSelect.value || 'rodeo';
    gameState.currentPlayer = 1;
    gameState.gameStarted = true;
    gameState.gameEnded = false;
    gameState.board = Array(6).fill(null).map(()=>Array(6).fill(null));
    gameState.players[1] = { pieces:18, captures:0, score:0, color:'player1' };
    gameState.players[2] = { pieces:18, captures:0, score:0, color:'player2' };
    gameState.diceResult = { number:null, letter:null };
    gameState.firstTurn = true;
    gameState.turnPhase = 'place';
    gameState.isRolling = false;
    gameState.isPlacing = false;
    if (elements.startScreen) elements.startScreen.classList.add('hidden');
    if (elements.gameScreen) elements.gameScreen.classList.remove('hidden');
    createBoard(); updateUI(); showMessage('Determinando quién empieza...', 'info');
    setTimeout(determineFirstPlayer, 800);
}

function determineFirstPlayer(){
    const r1 = Math.floor(Math.random()*6)+1;
    const r2 = Math.floor(Math.random()*6)+1;
    if (r1>r2){ gameState.currentPlayer=1; gameState.turnPhase='place'; showMessage('Jugador 1 comienza. Coloca una ficha.','success'); }
    else if (r2>r1){ gameState.currentPlayer=2; gameState.turnPhase='place'; showMessage('Jugador 2 comienza. Coloca una ficha.','success'); }
    else { showMessage('Empate al decidir. Reintentando...','warning'); setTimeout(determineFirstPlayer,800); return; }
    gameState.firstTurn=false; updateUI();
}

function rollDice(){
    if (gameState.turnPhase !== 'roll' || gameState.gameEnded || gameState.isRolling) return;
    gameState.isRolling = true; elements.rollDiceBtn.disabled = true; clearHighlights();
    let cnt=0; const it = setInterval(()=>{
        const nr = Math.floor(Math.random()*6)+1;
        const lt = config.letterDie[Math.floor(Math.random()*6)];
        elements.numberResult.textContent = nr; elements.letterResult.textContent = lt; cnt++;
        if (cnt>=12){ clearInterval(it);
            gameState.diceResult.number = Math.floor(Math.random()*6)+1;
            gameState.diceResult.letter = config.letterDie[Math.floor(Math.random()*6)];
            elements.numberResult.textContent = gameState.diceResult.number;
            elements.letterResult.textContent = gameState.diceResult.letter;
            const coordinate = `${gameState.diceResult.letter}${gameState.diceResult.number}`;
            elements.diceResult.textContent = `Resultado: ${coordinate}`; elements.diceResult.classList.remove('hidden');
            const captured = checkDiceCapture(coordinate);
            gameState.turnPhase = 'place'; gameState.isRolling = false;
            if (captured) showMessage(`Dados: ${coordinate}. ¡Ficha capturada! Ahora coloca tu ficha.`,'success');
            else showMessage(`Dados: ${coordinate}. No hubo captura. Coloca tu ficha.`,'info');
            updateUI();
        }
    },80);
}

function highlightDiceTarget(coordinate){ clearHighlights(); const cell = document.querySelector(`[data-coordinate="${coordinate}"]`); if (cell) cell.classList.add('dice-target'); }
function clearHighlights(){ document.querySelectorAll('.dice-target, .highlight-capture').forEach(c=>c.classList.remove('dice-target','highlight-capture')); }

function checkDiceCapture(coordinate){
    const col = config.columns.indexOf(gameState.diceResult.letter);
    const row = gameState.diceResult.number - 1;
    if (row<0 || row>=6 || col<0 || col>=6) return false;
    if (gameState.board[row][col] !== null && gameState.board[row][col] !== gameState.currentPlayer){
        const capturedPlayer = gameState.board[row][col];
        gameState.board[row][col] = null; // sacar ficha del juego
        // puntaje
        gameState.players[gameState.currentPlayer].captures++;
        gameState.players[gameState.currentPlayer].score += 1; // 1 punto por comer
        // visual
        const cell = document.querySelector(`[data-coordinate="${coordinate}"]`);
        if (cell){ const piece = cell.querySelector('.piece'); if (piece){ piece.classList.add('captured'); cell.classList.add('highlight-capture'); setTimeout(()=>{ if (piece.parentNode) piece.remove(); cell.classList.remove('occupied','highlight-capture'); },350); } }
        updateUI(); return true;
    }
    return false;
}

function placePiece(row,col){
    if (!gameState.gameStarted || gameState.gameEnded || gameState.isPlacing) return;
    if (gameState.turnPhase !== 'place'){ if (gameState.turnPhase==='roll') showMessage('Primero debes tirar los dados','warning'); return; }
    if (gameState.board[row][col] !== null){ showMessage('Casilla ocupada','warning'); return; }
    if (gameState.players[gameState.currentPlayer].pieces <= 0){ showMessage('No tienes fichas','error'); return; }
    const coordinate = `${config.columns[col]}${row+1}`;
    gameState.isPlacing = true; clearHighlights();
    gameState.board[row][col] = gameState.currentPlayer;
    gameState.players[gameState.currentPlayer].pieces--;
    // UI
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (cell){ const piece = document.createElement('div'); piece.className = `piece ${gameState.players[gameState.currentPlayer].color}`; piece.textContent = gameState.currentPlayer; piece.setAttribute('aria-label', `Ficha del Jugador ${gameState.currentPlayer}`); cell.appendChild(piece); cell.classList.add('occupied'); cell.setAttribute('aria-label', `Casilla ${coordinate} ocupada por Jugador ${gameState.currentPlayer}`); }
    // comprobar rodeos (puede otorgar 2 pts por ficha)
    setTimeout(()=>{
        const captured = checkSurroundCaptures();
        if (checkGameEnd()){ endGame(); return; }
        // despues de colocar, el oponente tiene oportunidad de tirar
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        gameState.turnPhase = 'roll';
        showMessage(`Turno de Jugador ${gameState.currentPlayer}. Tira los dados para intentar comer la ficha rival.`, 'info');
        updateUI();
        gameState.isPlacing = false;
    },250);
}

function checkSurroundCaptures(){
    const opponent = gameState.currentPlayer === 1 ? 2 : 1;
    const captured = []; const visited = Array(6).fill(null).map(()=>Array(6).fill(false));
    for (let r=0;r<6;r++) for (let c=0;c<6;c++) if (gameState.board[r][c] === opponent && !visited[r][c]){
        const group = findConnectedGroup(r,c,opponent,visited);
        if (isGroupSurrounded(group, gameState.currentPlayer)) captured.push(...group);
    }
    // aplicar
    captured.forEach(pos=>{
        if (gameState.board[pos.row][pos.col] === opponent){
            gameState.board[pos.row][pos.col] = null;
            gameState.players[gameState.currentPlayer].captures++;
            gameState.players[gameState.currentPlayer].score += 2; // 2 pts por ficha rodeada
            const cell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (cell){ const piece = cell.querySelector('.piece'); if (piece){ piece.classList.add('captured'); cell.classList.add('highlight-capture'); setTimeout(()=>{ if (piece.parentNode) piece.remove(); cell.classList.remove('occupied','highlight-capture'); },350); } }
        }
    });
    if (captured.length>0){ showMessage(`¡Captura por rodeamiento! ${captured.length} ficha(s).`,'success'); updateUI(); return captured.length; }
    return 0;
}

function findConnectedGroup(startRow,startCol,player,visited){
    const group=[]; const stack=[{row:startRow,col:startCol}];
    while(stack.length){ const p = stack.pop(); const row=p.row, col=p.col; if (row<0||row>=6||col<0||col>=6) continue; if (visited[row][col]) continue; if (gameState.board[row][col] !== player) continue; visited[row][col]=true; group.push({row,col}); stack.push({row:row-1,col},{row:row+1,col},{row,col:col-1},{row,col:col+1}); }
    return group;
}

function isGroupSurrounded(group,surroundingPlayer){
    for(const pos of group){
        const neighbors=[{row:pos.row-1,col:pos.col},{row:pos.row+1,col:pos.col},{row:pos.row,col:pos.col-1},{row:pos.row,col:pos.col+1}];
        for(const n of neighbors){
            if (n.row<0||n.row>=6||n.col<0||n.col>=6){
                if (gameState.mode === 'encerrado'){
                    // borde cuenta como cerrado en modo "encerrado"
                    continue;
                }
                return false;
            }
            if (gameState.board[n.row][n.col] !== surroundingPlayer) return false;
        }
    }
    return true;
}

function nextTurn(){
    // Usado solo si se necesita forzar cambio; la nueva secuencia la maneja placePiece
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1; gameState.turnPhase = 'place'; updateUI();
}

function checkGameEnd(){
    const total = gameState.players[1].pieces + gameState.players[2].pieces;
    return total === 0;
}

function endGame(){
    gameState.gameEnded = true;
    const p1 = gameState.players[1].score; const p2 = gameState.players[2].score; const c1 = gameState.players[1].captures; const c2 = gameState.players[2].captures;
    let winner=null, message='';
    if (p1>p2){ winner='Jugador 1'; message=`¡Jugador 1 gana con ${p1} puntos!`; }
    else if (p2>p1){ winner='Jugador 2'; message=`¡Jugador 2 gana con ${p2} puntos!`; }
    else { message=`¡Empate! Ambos con ${p1} puntos.`; }
    elements.victoryTitle.textContent = winner ? `¡${winner} Gana!` : '¡Empate!';
    elements.victoryMessage.innerHTML = `<p><strong>${message}</strong></p><p><strong>Puntuación final:</strong></p><p>Jugador 1: ${p1} puntos (${c1} capturas)</p><p>Jugador 2: ${p2} puntos (${c2} capturas)</p><p>Fichas colocadas: ${36 - (gameState.players[1].pieces + gameState.players[2].pieces)} de 36</p>`;
    showVictoryModal();
}

function updateUI(){
    if (!elements) return;
    elements.turnIndicator.textContent = `Turno: Jugador ${gameState.currentPlayer}`;
    elements.phaseIndicator.textContent = (gameState.turnPhase === 'roll') ? 'Tira los dados primero' : 'Coloca tu ficha en el tablero';
    elements.player1Card.classList.toggle('active', gameState.currentPlayer===1);
    elements.player2Card.classList.toggle('active', gameState.currentPlayer===2);
    elements.player1Pieces.textContent = gameState.players[1].pieces;
    elements.player2Pieces.textContent = gameState.players[2].pieces;
    elements.player1Captures.textContent = gameState.players[1].score;
    elements.player2Captures.textContent = gameState.players[2].score;
    const shouldEnableDice = gameState.turnPhase === 'roll' && !gameState.gameEnded && !gameState.isRolling;
    elements.rollDiceBtn.disabled = !shouldEnableDice;
    elements.rollDiceBtn.textContent = (gameState.turnPhase === 'roll' && !gameState.gameEnded) ? (gameState.isRolling? 'Tirando...' : 'Tirar Dados') : 'Dados Tirados';
}

function showMessage(msg,type='info'){ if (elements && elements.gameMessage){ elements.gameMessage.textContent = msg; elements.gameMessage.className = `status status--${type}`; } console.log(msg); }
function showStartScreen(){ if (elements){ elements.gameScreen.classList.add('hidden'); elements.startScreen.classList.remove('hidden'); } gameState.gameStarted=false; gameState.gameEnded=false; clearHighlights(); }
function showVictoryModal(){ if (elements) { elements.victoryModal.classList.remove('hidden'); elements.modalOverlay.classList.remove('hidden'); } }
function hideVictoryModal(){ if (elements){ elements.victoryModal.classList.add('hidden'); elements.modalOverlay.classList.add('hidden'); } }
