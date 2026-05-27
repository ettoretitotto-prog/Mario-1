// Game constants
const WIDTH = 800;
const HEIGHT = 600;
const LEVEL_HEIGHT = 1600;
const FPS = 60;
const COIN_TARGET = 10;

// Colors
const SKY_TOP = { r: 75, g: 170, b: 255 };
const SKY_BOTTOM = { r: 240, g: 220, b: 190 };
const GROUND = { r: 95, g: 60, b: 35 };
const GRASS = { r: 140, g: 215, b: 100 };
const PLAYER_SKIN = { r: 255, g: 214, b: 178 };
const PLAYER_SHIRT = { r: 220, g: 75, b: 110 };
const PLAYER_HAT = { r: 120, g: 65, b: 190 };
const PLAYER_HAIR = { r: 55, g: 35, b: 20 };
const PLATFORM_TOP = { r: 160, g: 215, b: 110 };
const PLATFORM_SIDE = { r: 92, g: 62, b: 35 };
const LADDER_RAIL = { r: 170, g: 110, b: 70 };
const LADDER_RUNG = { r: 230, g: 175, b: 100 };
const COIN_COLOR = { r: 255, g: 220, b: 80 };
const COIN_HIGHLIGHT = { r: 255, g: 250, b: 160 };
const ENEMY_RED = { r: 195, g: 50, b: 75 };
const ENEMY_SHELL = { r: 150, g: 40, b: 60 };
const TEXT_COLOR = { r: 30, g: 30, b: 40 };

// Physics
const GRAVITY = 0.9;
const JUMP_SPEED = -18;
const MOVE_SPEED = 7;
const CLIMB_SPEED = 4;

// Game state
let canvas, ctx;
let player;
let tiles = [];
let ladders = [];
let coins = [];
let enemies = [];
let cameraY = LEVEL_HEIGHT - HEIGHT;
let cameraTarget = cameraY;
let gameRunning = true;
let keys = { left: false, right: false, up: false, down: false };

// Touch controls
let touchLeft = false;
let touchRight = false;
let touchJump = false;

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velX = 0;
        this.velY = 0;
        this.onGround = false;
        this.onLadder = false;
        this.ladderCooldown = 0;
        this.coinCount = 0;
        this.facingRight = true;
        this.frameIndex = 0;
        this.animationTimer = 0;
    }

    update() {
        // Input handling
        this.velX = 0;
        if (keys.left || touchLeft) {
            this.velX = -MOVE_SPEED;
            this.facingRight = false;
        }
        if (keys.right || touchRight) {
            this.velX = MOVE_SPEED;
            this.facingRight = true;
        }

        // Ladder detection
        let ladderHit = this.checkLadderCollision();
        if (this.ladderCooldown > 0) {
            this.ladderCooldown--;
            ladderHit = null;
        }
        this.onLadder = ladderHit !== null;

        if (this.onLadder) {
            if (keys.up || keys.down) {
                this.velY = keys.up ? -CLIMB_SPEED : CLIMB_SPEED;
            } else {
                this.velY = 0;
            }
        } else {
            this.velY += GRAVITY;
            if (this.velY > 20) this.velY = 20;
        }

        // Horizontal movement and collision
        this.x += this.velX;
        this.handleHorizontalCollisions();

        // Boundary checking
        if (this.x < 0) this.x = 0;
        if (this.x > WIDTH - this.width) this.x = WIDTH - this.width;

        // Vertical movement and collision
        this.y += this.velY;
        this.onGround = false;
        this.handleVerticalCollisions();

        // Animation
        this.updateAnimation();
    }

    checkLadderCollision() {
        for (let ladder of ladders) {
            if (this.x < ladder.x + ladder.width &&
                this.x + this.width > ladder.x &&
                this.y < ladder.y + ladder.height &&
                this.y + this.height > ladder.y) {
                return ladder;
            }
        }
        return null;
    }

    handleHorizontalCollisions() {
        for (let tile of tiles) {
            if (this.checkCollision(tile)) {
                if (this.velX > 0) {
                    this.x = tile.x - this.width;
                } else if (this.velX < 0) {
                    this.x = tile.x + tile.width;
                }
            }
        }
    }

    handleVerticalCollisions() {
        for (let tile of tiles) {
            if (this.checkCollision(tile)) {
                if (this.velY > 0) {
                    this.y = tile.y - this.height;
                    this.velY = 0;
                    this.onGround = true;
                } else if (this.velY < 0) {
                    this.y = tile.y + tile.height;
                    this.velY = 0;
                }
            }
        }
    }

    checkCollision(tile) {
        return this.x < tile.x + tile.width &&
               this.x + this.width > tile.x &&
               this.y < tile.y + tile.height &&
               this.y + this.height > tile.y;
    }

    jump() {
        if (this.onGround || this.onLadder) {
            this.velY = JUMP_SPEED;
            this.onGround = false;
            this.onLadder = false;
            this.ladderCooldown = 14;
        }
    }

    updateAnimation() {
        const walking = Math.abs(this.velX) > 0 && this.onGround;
        if (walking) {
            this.animationTimer++;
            if (this.animationTimer >= 6) {
                this.animationTimer = 0;
                this.frameIndex = (this.frameIndex + 1) % 3;
            }
        } else {
            this.frameIndex = 0;
            this.animationTimer = 0;
        }
    }

    draw(ctx, cameraY) {
        ctx.save();
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, this.y - cameraY);
            ctx.scale(-1, 1);
            ctx.translate(-this.x - this.width, -(this.y - cameraY));
        }

        // Draw player
        const drawY = this.y - cameraY;
        
        // Body
        ctx.fillStyle = `rgb(${PLAYER_SHIRT.r}, ${PLAYER_SHIRT.g}, ${PLAYER_SHIRT.b})`;
        ctx.beginPath();
        ctx.roundRect(this.x + 4, drawY + 28, 32, 24, 10);
        ctx.fill();

        // Head
        ctx.fillStyle = `rgb(${PLAYER_SKIN.r}, ${PLAYER_SKIN.g}, ${PLAYER_SKIN.b})`;
        ctx.beginPath();
        ctx.ellipse(this.x + 20, drawY + 15, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = `rgb(${PLAYER_SKIN.r}, ${PLAYER_SKIN.g}, ${PLAYER_SKIN.b})`;
        ctx.beginPath();
        ctx.ellipse(this.x + 27, drawY + 20, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = `rgb(${PLAYER_HAT.r}, ${PLAYER_HAT.g}, ${PLAYER_HAT.b})`;
        ctx.beginPath();
        ctx.roundRect(this.x + 8, drawY, 24, 10, 6);
        ctx.fill();

        // Hair
        ctx.fillStyle = `rgb(${PLAYER_HAIR.r}, ${PLAYER_HAIR.g}, ${PLAYER_HAIR.b})`;
        ctx.beginPath();
        ctx.arc(this.x + 20, drawY + 12, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 14, drawY + 14, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 26, drawY + 14, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgb(25, 25, 30)';
        ctx.beginPath();
        ctx.arc(this.x + 14, drawY + 14, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 26, drawY + 14, 2, 0, Math.PI * 2);
        ctx.fill();

        // Legs animation
        const legOffset = [(-3, 2), (0, 0), (3, -2)][this.frameIndex];
        ctx.fillStyle = `rgb(${PLAYER_HAIR.r}, ${PLAYER_HAIR.g}, ${PLAYER_HAIR.b})`;
        ctx.beginPath();
        ctx.roundRect(this.x + 10 + legOffset[0], drawY + 34 + legOffset[1], 8, 16, 4);
        ctx.roundRect(this.x + 22 + legOffset[0], drawY + 34 - legOffset[1], 8, 16, 4);
        ctx.fill();

        // Smile
        ctx.strokeStyle = 'rgb(245, 160, 180)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x + 20, drawY + 33, 12, Math.PI, 2 * Math.PI);
        ctx.stroke();

        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, leftLimit, rightLimit) {
        this.x = x;
        this.y = y;
        this.width = 38;
        this.height = 28;
        this.leftLimit = leftLimit;
        this.rightLimit = rightLimit;
        this.dir = 1;
        this.speed = 2.2;
        this.velY = 0;
        this.onGround = false;
    }

    update() {
        this.x += this.speed * this.dir;
        if (this.x <= this.leftLimit || this.x + this.width >= this.rightLimit) {
            this.dir *= -1;
        }

        // Apply gravity
        this.velY += GRAVITY;
        if (this.velY > 20) this.velY = 20;

        this.y += this.velY;
        this.onGround = false;

        // Floor collision
        for (let tile of tiles) {
            if (this.checkCollision(tile)) {
                if (this.velY > 0) {
                    this.y = tile.y - this.height;
                    this.velY = 0;
                    this.onGround = true;
                }
            }
        }
    }

    checkCollision(tile) {
        return this.x < tile.x + tile.width &&
               this.x + this.width > tile.x &&
               this.y < tile.y + tile.height &&
               this.y + this.height > tile.y;
    }

    draw(ctx, cameraY) {
        const drawY = this.y - cameraY;
        
        // Shell
        ctx.fillStyle = `rgb(${ENEMY_SHELL.r}, ${ENEMY_SHELL.g}, ${ENEMY_SHELL.b})`;
        ctx.beginPath();
        ctx.roundRect(this.x, drawY + 10, this.width, 16, 10);
        ctx.fill();

        // Body
        ctx.fillStyle = `rgb(${ENEMY_RED.r}, ${ENEMY_RED.g}, ${ENEMY_RED.b})`;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, drawY + 12, 19, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 12, drawY + 10, 5, 0, Math.PI * 2);
        ctx.arc(this.x + 26, drawY + 10, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgb(35, 35, 45)';
        ctx.beginPath();
        ctx.arc(this.x + 12, drawY + 10, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 26, drawY + 10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Cheeks
        ctx.fillStyle = 'rgb(255, 220, 220)';
        ctx.beginPath();
        ctx.arc(this.x + 10, drawY + 6, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 28, drawY + 6, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createLevel() {
    tiles = [];
    ladders = [];
    coins = [];
    enemies = [];

    // Ground
    for (let i = 0; i < WIDTH; i += 80) {
        tiles.push({ x: i, y: LEVEL_HEIGHT - 40, width: 80, height: 40 });
    }

    // Platforms
    const platformData = [
        { x: 200, y: LEVEL_HEIGHT - 150, width: 300, height: 24 },
        { x: 450, y: LEVEL_HEIGHT - 270, width: 300, height: 24 },
        { x: 200, y: LEVEL_HEIGHT - 390, width: 300, height: 24 },
        { x: 450, y: LEVEL_HEIGHT - 510, width: 300, height: 24 },
        { x: 200, y: LEVEL_HEIGHT - 630, width: 300, height: 24 },
        { x: 450, y: LEVEL_HEIGHT - 750, width: 300, height: 24 },
        { x: 200, y: LEVEL_HEIGHT - 870, width: 300, height: 24 },
        { x: 450, y: LEVEL_HEIGHT - 990, width: 300, height: 24 },
        { x: 200, y: LEVEL_HEIGHT - 1110, width: 300, height: 24 },
        { x: 450, y: LEVEL_HEIGHT - 1230, width: 300, height: 24 },
    ];
    tiles.push(...platformData);

    // Ladder from floor 5 to floor 7
    ladders.push({ x: 50, y: LEVEL_HEIGHT - 890, width: 40, height: 280 });

    // Coins
    const coinData = [
        { x: 350, y: LEVEL_HEIGHT - 180 },
        { x: 600, y: LEVEL_HEIGHT - 300 },
        { x: 350, y: LEVEL_HEIGHT - 420 },
        { x: 600, y: LEVEL_HEIGHT - 540 },
        { x: 350, y: LEVEL_HEIGHT - 660 },
        { x: 600, y: LEVEL_HEIGHT - 780 },
        { x: 350, y: LEVEL_HEIGHT - 900 },
        { x: 600, y: LEVEL_HEIGHT - 1020 },
        { x: 350, y: LEVEL_HEIGHT - 1140 },
        { x: 600, y: LEVEL_HEIGHT - 1260 },
    ];
    coins = coinData.map(c => ({ x: c.x, y: c.y, radius: 12 }));

    // Enemies
    enemies.push(new Enemy(450, LEVEL_HEIGHT - 270, 300, 600));
    enemies.push(new Enemy(450, LEVEL_HEIGHT - 990, 300, 600));
}

function drawBackground(ctx, cameraY) {
    // Sky gradient
    for (let y = 0; y < HEIGHT; y += 40) {
        const ratio = y / HEIGHT;
        const r = Math.round(SKY_TOP.r * (1 - ratio) + SKY_BOTTOM.r * ratio);
        const g = Math.round(SKY_TOP.g * (1 - ratio) + SKY_BOTTOM.g * ratio);
        const b = Math.round(SKY_TOP.b * (1 - ratio) + SKY_BOTTOM.b * ratio);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, y, WIDTH, 40);
    }

    // Clouds
    const clouds = [{ x: 120, y: 140 }, { x: 520, y: 180 }, { x: 220, y: 80 }, { x: 640, y: 260 }];
    ctx.fillStyle = 'white';
    for (let cloud of clouds) {
        const cy = cloud.y - cameraY * 0.28;
        if (cy > -80 && cy < HEIGHT + 80) {
            ctx.beginPath();
            ctx.arc(cloud.x, cy, 26, 0, Math.PI * 2);
            ctx.arc(cloud.x + 24, cy + 8, 18, 0, Math.PI * 2);
            ctx.arc(cloud.x - 24, cy + 8, 18, 0, Math.PI * 2);
            ctx.arc(cloud.x + 12, cy - 10, 14, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Sun
    const sunY = Math.max(40, 80 - Math.floor(cameraY * 0.1));
    ctx.fillStyle = 'rgb(255, 210, 120)';
    ctx.beginPath();
    ctx.arc(WIDTH - 100, sunY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgb(255, 220, 140)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const sx = WIDTH - 100 + Math.cos(angle) * 50;
        const sy = sunY + Math.sin(angle) * 50;
        ctx.beginPath();
        ctx.moveTo(WIDTH - 100, sunY);
        ctx.lineTo(sx, sy);
        ctx.stroke();
    }
}

function drawTile(ctx, tile, cameraY) {
    const drawY = tile.y - cameraY;
    
    // Platform side
    ctx.fillStyle = `rgb(${PLATFORM_SIDE.r}, ${PLATFORM_SIDE.g}, ${PLATFORM_SIDE.b})`;
    ctx.beginPath();
    ctx.roundRect(tile.x, drawY + 8, tile.width, tile.height - 8, 10);
    ctx.fill();

    // Platform top
    ctx.fillStyle = `rgb(${PLATFORM_TOP.r}, ${PLATFORM_TOP.g}, ${PLATFORM_TOP.b})`;
    ctx.beginPath();
    ctx.roundRect(tile.x, drawY, tile.width, 14, 10);
    ctx.fill();

    // Grass
    ctx.fillStyle = `rgb(${GRASS.r}, ${GRASS.g}, ${GRASS.b})`;
    ctx.beginPath();
    ctx.roundRect(tile.x + 2, drawY, tile.width - 4, 10, 8);
    ctx.fill();
}

function drawLadder(ctx, ladder, cameraY) {
    const drawY = ladder.y - cameraY;
    
    // Rails
    ctx.fillStyle = `rgb(${LADDER_RAIL.r}, ${LADDER_RAIL.g}, ${LADDER_RAIL.b})`;
    ctx.beginPath();
    ctx.roundRect(ladder.x, drawY, ladder.width, ladder.height, 6);
    ctx.fill();

    // Rungs
    ctx.fillStyle = `rgb(${LADDER_RUNG.r}, ${LADDER_RUNG.g}, ${LADDER_RUNG.b})`;
    const rungWidth = Math.max(14, ladder.width - 18);
    for (let y = 12; y < ladder.height - 12; y += 30) {
        ctx.beginPath();
        ctx.roundRect(ladder.x + (ladder.width - rungWidth) / 2, drawY + y, rungWidth, 6, 3);
        ctx.fill();
    }
}

function drawCoin(ctx, coin, cameraY) {
    const drawY = coin.y - cameraY;
    
    ctx.fillStyle = `rgb(${COIN_COLOR.r}, ${COIN_COLOR.g}, ${COIN_COLOR.b})`;
    ctx.beginPath();
    ctx.arc(coin.x, drawY, coin.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgb(${COIN_HIGHLIGHT.r}, ${COIN_HIGHLIGHT.g}, ${COIN_HIGHLIGHT.b})`;
    ctx.beginPath();
    ctx.arc(coin.x - 4, drawY - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(240, 205, 45)';
    ctx.beginPath();
    ctx.arc(coin.x, drawY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(255, 255, 190)';
    ctx.beginPath();
    ctx.arc(coin.x + 4, drawY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawGround(ctx, cameraY) {
    ctx.fillStyle = `rgb(${GROUND.r}, ${GROUND.g}, ${GROUND.b})`;
    ctx.fillRect(0, LEVEL_HEIGHT - 40 - cameraY, WIDTH, 40);
}

function drawUI(ctx) {
    ctx.fillStyle = `rgb(${TEXT_COLOR.r}, ${TEXT_COLOR.g}, ${TEXT_COLOR.b})`;
    ctx.font = '20px Arial';
    ctx.fillText('Move with arrows or A/D. W/Up to jump/climb, S/Down to descend.', 14, 30);
    ctx.fillText(`Coins: ${player.coinCount}/${COIN_TARGET}`, 14, 60);
    
    ctx.font = 'bold 32px Arial';
    const titleText = 'Retro Platformer 2026';
    ctx.fillText(titleText, WIDTH / 2 - ctx.measureText(titleText).width / 2, 40);
}

function checkCollisions() {
    // Coin collection
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const dx = (player.x + player.width / 2) - coin.x;
        const dy = (player.y + player.height / 2) - coin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < coin.radius + 20) {
            coins.splice(i, 1);
            player.coinCount++;
        }
    }

    // Enemy collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // Stomp check
            if (player.velY > 0 && player.y + player.height <= enemy.y + 12) {
                enemies.splice(i, 1);
                player.velY = JUMP_SPEED * 0.7;
            } else {
                // Reset to start
                player.x = 80;
                player.y = LEVEL_HEIGHT - 120;
                player.velX = 0;
                player.velY = 0;
            }
        }
    }
}

function checkWinCondition() {
    if (player.y <= LEVEL_HEIGHT - 1230) {
        gameRunning = false;
        ctx.fillStyle = `rgb(${SKY_BOTTOM.r}, ${SKY_BOTTOM.g}, ${SKY_BOTTOM.b})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = `rgb(${TEXT_COLOR.r}, ${TEXT_COLOR.g}, ${TEXT_COLOR.b})`;
        ctx.font = 'bold 44px Arial';
        const winText = 'You win! You reached level 10!';
        ctx.fillText(winText, WIDTH / 2 - ctx.measureText(winText).width / 2, HEIGHT / 2);
        return true;
    }
    return false;
}

function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.fillStyle = `rgb(${SKY_TOP.r}, ${SKY_TOP.g}, ${SKY_TOP.b})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Update
    player.update();
    enemies.forEach(e => e.update());
    checkCollisions();

    // Camera
    cameraTarget = Math.max(0, Math.min(LEVEL_HEIGHT - HEIGHT, player.y - HEIGHT / 3));
    cameraY += (cameraTarget - cameraY) * 0.12;

    // Draw
    drawBackground(ctx, cameraY);
    drawGround(ctx, cameraY);
    tiles.forEach(tile => drawTile(ctx, tile, cameraY));
    ladders.forEach(ladder => drawLadder(ctx, ladder, cameraY));
    coins.forEach(coin => drawCoin(ctx, coin, cameraY));
    enemies.forEach(enemy => enemy.draw(ctx, cameraY));
    player.draw(ctx, cameraY);
    drawUI(ctx);

    // Check win
    if (checkWinCondition()) return;

    requestAnimationFrame(gameLoop);
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    createLevel();
    player = new Player(80, LEVEL_HEIGHT - 120);

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
            keys.up = true;
            player.jump();
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
    });

    // Touch controls
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');

    leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchLeft = true; });
    leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchLeft = false; });
    rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchRight = true; });
    rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchRight = false; });
    jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); player.jump(); });

    // Mouse controls for testing
    leftBtn.addEventListener('mousedown', () => touchLeft = true);
    leftBtn.addEventListener('mouseup', () => touchLeft = false);
    leftBtn.addEventListener('mouseleave', () => touchLeft = false);
    rightBtn.addEventListener('mousedown', () => touchRight = true);
    rightBtn.addEventListener('mouseup', () => touchRight = false);
    rightBtn.addEventListener('mouseleave', () => touchRight = false);
    jumpBtn.addEventListener('mousedown', () => player.jump());

    gameLoop();
}

// Start game when page loads
window.addEventListener('load', init);
