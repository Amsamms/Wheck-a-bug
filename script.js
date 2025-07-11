// Game constants
const GAME_DURATION = 30; // seconds
const GRID_SIZE = 3; // 3x3 grid
const BASE_POINTS = 10;
const GOLDEN_POINTS = 25;
const FRIENDLY_PENALTY = -15;
const COMBO_MULTIPLIER = 1.5;
const INITIAL_SPAWN_DELAY = 2000; // 2 seconds
const MIN_SPAWN_DELAY = 800; // 0.8 seconds
const INITIAL_TARGET_DURATION = 2500; // 2.5 seconds
const MIN_TARGET_DURATION = 1000; // 1 second

// Game state
let score = 0;
let combo = 1;
let gameActive = false;
let timeLeft = GAME_DURATION;
let currentTargets = new Set();
let spawnInterval;
let difficultyInterval;

// DOM elements - will be initialized when DOM is ready
let gameGrid, scoreValue, timerValue, comboValue;
let startOverlay, gameOverOverlay, startButton, restartButton;
let highScoreValue, finalScoreValue;

// Sound effects - will be initialized when DOM is ready
let sounds = {};

// Target types
const targetTypes = {
    bug: { emoji: '🪲', points: BASE_POINTS, class: 'bug', sound: 'splat' },
    friendly: { emoji: '🌸', points: FRIENDLY_PENALTY, class: 'friendly', sound: 'oops' },
    golden: { emoji: '🌟', points: GOLDEN_POINTS, class: 'golden', sound: 'golden' }
};

// Initialize game grid
function initializeGrid() {
    console.log('Initializing grid...');
    if (!gameGrid) {
        console.error('Game grid element not found!');
        return;
    }
    
    gameGrid.innerHTML = '';
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        hole.dataset.index = i;
        hole.addEventListener('click', handleHoleClick);
        gameGrid.appendChild(hole);
        console.log(`Created hole ${i}`);
    }
    console.log(`Grid initialized with ${GRID_SIZE * GRID_SIZE} holes`);
}

// Start game
function startGame() {
    console.log('Starting game...');
    
    // Clear any existing intervals/timeouts first
    if (spawnInterval) {
        clearTimeout(spawnInterval);
        spawnInterval = null;
    }
    if (difficultyInterval) {
        clearInterval(difficultyInterval);
        difficultyInterval = null;
    }
    
    // Reset game state
    score = 0;
    combo = 1;
    timeLeft = GAME_DURATION;
    currentTargets.clear();
    gameActive = true;
    
    // Clear any existing targets
    document.querySelectorAll('.target').forEach(target => target.remove());
    
    // Update UI
    updateScore();
    updateCombo();
    updateTimer();
    
    // Hide overlays
    startOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    
    // Start game loop
    startGameLoop();
    console.log('Game started successfully');
}

// Game loop
function startGameLoop() {
    // Start timer
    const timer = setInterval(() => {
        if (!gameActive) {
            clearInterval(timer);
            return;
        }
        
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    // Start spawning targets
    spawnTargets();
    
    // Start difficulty ramp-up
    startDifficultyRamp();
}

// Spawn targets
function spawnTargets() {
    if (!gameActive) {
        console.log('Spawn cancelled - game not active');
        return;
    }
    
    // Simpler delay calculation for debugging
    const delay = Math.max(MIN_SPAWN_DELAY, 2000 - (30 - timeLeft) * 50);
    
    console.log(`Next spawn in ${delay}ms, timeLeft: ${timeLeft}, gameActive: ${gameActive}`);
    
    spawnInterval = setTimeout(() => {
        if (!gameActive) {
            console.log('Spawn timeout cancelled - game not active');
            return;
        }
        
        const availableHoles = Array.from(document.querySelectorAll('.hole'))
            .filter(hole => !currentTargets.has(hole.dataset.index));
        
        console.log(`Available holes: ${availableHoles.length}, total holes: ${document.querySelectorAll('.hole').length}`);
        
        if (availableHoles.length > 0) {
            const hole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
            console.log(`Selected hole ${hole.dataset.index} for spawning`);
            spawnTarget(hole);
        } else {
            console.log('No available holes found');
        }
        
        // Continue spawning
        spawnTargets();
    }, delay);
    
    console.log(`Spawn interval set with ID: ${spawnInterval}`);
}

// Spawn a single target
function spawnTarget(hole) {
    const targetType = getRandomTargetType();
    const target = document.createElement('div');
    target.className = `target ${targetType.class}`;
    target.textContent = targetType.emoji;
    target.dataset.type = targetType.class;
    target.dataset.points = targetType.points;
    
    console.log(`Spawning ${targetType.class} target in hole ${hole.dataset.index}`);
    
    // Clear any existing targets in the hole
    hole.innerHTML = '';
    
    hole.appendChild(target);
    currentTargets.add(hole.dataset.index);
    
    // Play pop sound
    if (sounds.pop) {
        sounds.pop.currentTime = 0;
        sounds.pop.play().catch(e => console.log('Sound play failed:', e));
    }
    
    // Show target immediately
    target.classList.add('up');
    console.log(`Target should be visible now with class: ${target.className}`);
    
    // Hide target after duration
    const duration = Math.max(
        MIN_TARGET_DURATION,
        INITIAL_TARGET_DURATION - (GAME_DURATION - timeLeft) * 20
    );
    
    setTimeout(() => {
        if (target.parentNode) {
            target.classList.remove('up');
            setTimeout(() => {
                if (target.parentNode) {
                    target.remove();
                    currentTargets.delete(hole.dataset.index);
                    console.log(`Target removed from hole ${hole.dataset.index}`);
                }
            }, 300);
        }
    }, duration);
}

// Get random target type
function getRandomTargetType() {
    const rand = Math.random();
    if (rand < 0.7) return targetTypes.bug;
    if (rand < 0.9) return targetTypes.friendly;
    return targetTypes.golden;
}

// Handle hole click
function handleHoleClick(event) {
    if (!gameActive) return;
    
    const target = event.currentTarget.querySelector('.target');
    if (!target) return;
    
    const points = parseInt(target.dataset.points);
    const type = target.dataset.type;
    
    // Update score and combo
    if (type === 'bug' || type === 'golden') {
        combo++;
        updateCombo();
    } else {
        combo = 1;
        updateCombo();
    }
    
    const finalPoints = Math.round(points * (combo > 1 ? COMBO_MULTIPLIER : 1));
    score += finalPoints;
    updateScore();
    
    // Play sound effect
    const soundKey = targetTypes[type] ? targetTypes[type].sound : 'splat';
    if (sounds[soundKey]) {
        sounds[soundKey].currentTime = 0;
        sounds[soundKey].play().catch(e => console.log('Sound play failed:', e));
    }
    
    // Show score popup
    showScorePopup(event.clientX, event.clientY, finalPoints);
    
    // Remove target
    target.remove();
    currentTargets.delete(event.currentTarget.dataset.index);
}

// Show score popup
function showScorePopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `${points > 0 ? '+' : ''}${points}`;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    
    document.body.appendChild(popup);
    
    popup.addEventListener('animationend', () => {
        popup.remove();
    });
}

// Update UI
function updateScore() {
    scoreValue.textContent = score;
}

function updateTimer() {
    timerValue.textContent = timeLeft;
}

function updateCombo() {
    comboValue.textContent = `x${combo}`;
}

// Start difficulty ramp-up
function startDifficultyRamp() {
    difficultyInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(difficultyInterval);
            return;
        }
        
        // Difficulty increases as time decreases
        const difficulty = (GAME_DURATION - timeLeft) / GAME_DURATION;
        
        // Adjust spawn delay and target duration based on difficulty
        const spawnDelay = Math.max(
            MIN_SPAWN_DELAY,
            INITIAL_SPAWN_DELAY - (difficulty * (INITIAL_SPAWN_DELAY - MIN_SPAWN_DELAY) * 0.7) // Added 0.7 multiplier to make it slower
        );
        
        const targetDuration = Math.max(
            MIN_TARGET_DURATION,
            INITIAL_TARGET_DURATION - (difficulty * (INITIAL_TARGET_DURATION - MIN_TARGET_DURATION) * 0.7) // Added 0.7 multiplier to make it slower
        );
        
        // Update intervals
        clearTimeout(spawnInterval);
        spawnTargets();
    }, 1000);
}

// End game
function endGame() {
    console.log('Ending game...');
    gameActive = false;
    
    // Clear all intervals and timeouts
    if (spawnInterval) {
        clearTimeout(spawnInterval);
        spawnInterval = null;
    }
    if (difficultyInterval) {
        clearInterval(difficultyInterval);
        difficultyInterval = null;
    }
    
    // Clear any remaining targets
    currentTargets.clear();
    document.querySelectorAll('.target').forEach(target => target.remove());
    
    // Update high score
    const highScore = Math.max(parseInt(localStorage.getItem('highScore') || '0'), score);
    localStorage.setItem('highScore', highScore);
    
    // Update UI
    finalScoreValue.textContent = score;
    highScoreValue.textContent = highScore;
    gameOverOverlay.style.display = 'flex';
    console.log('Game ended');
}

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game initializing...');
    
    // Initialize DOM elements
    gameGrid = document.querySelector('.game-grid');
    scoreValue = document.querySelector('.score-value');
    timerValue = document.querySelector('.timer-value');
    comboValue = document.querySelector('.combo-value');
    startOverlay = document.getElementById('startOverlay');
    gameOverOverlay = document.getElementById('gameOverOverlay');
    startButton = document.querySelector('.start-button');
    restartButton = document.querySelector('.restart-button');
    highScoreValue = document.querySelector('.high-score-value');
    finalScoreValue = document.querySelector('.final-score-value');
    
    // Check if all DOM elements exist
    const elements = {
        gameGrid, scoreValue, timerValue, comboValue,
        startOverlay, gameOverOverlay, startButton, restartButton,
        highScoreValue, finalScoreValue
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${name}`);
        } else {
            console.log(`✓ Found element: ${name}`);
        }
    }
    
    // Initialize sound effects
    sounds = {
        pop: document.getElementById('popSound'),
        splat: document.getElementById('splatSound'),
        oops: document.getElementById('oopsSound'),
        golden: document.getElementById('goldenSound'),
        powerup: document.getElementById('powerupSound')
    };
    
    // Check sounds
    for (const [name, sound] of Object.entries(sounds)) {
        if (!sound) {
            console.warn(`Sound not found: ${name}`);
        } else {
            console.log(`✓ Found sound: ${name}`);
        }
    }
    
    // Add event listeners
    if (startButton) {
        startButton.addEventListener('click', startGame);
        console.log('✓ Start button event listener added');
    }
    if (restartButton) {
        restartButton.addEventListener('click', startGame);
        console.log('✓ Restart button event listener added');
    }
    
    initializeGrid();
    
    if (highScoreValue) {
        highScoreValue.textContent = localStorage.getItem('highScore') || '0';
    }
    
    console.log('Game initialized successfully');
    
    // Add debug function to window for testing
    window.debugSpawn = function() {
        console.log('Manual debug spawn triggered');
        const holes = document.querySelectorAll('.hole');
        if (holes.length > 0) {
            spawnTarget(holes[0]);
        }
    };
    
    window.debugGameState = function() {
        console.log({
            gameActive,
            timeLeft,
            currentTargets: Array.from(currentTargets),
            holes: document.querySelectorAll('.hole').length,
            targets: document.querySelectorAll('.target').length
        });
    };
}); 