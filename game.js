// 🎮 Fortnite 2D Game Engine
class Fortnite2D {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game State
        this.gameRunning = false;
        this.gameOver = false;
        this.victory = false;
        this.score = 0;
        
        // Player
        this.player = {
            x: 400,
            y: 300,
            width: 40,
            height: 60,
            speed: 5,
            health: 100,
            shield: 100,
            ammo: 30,
            maxAmmo: 30,
            kills: 0,
            weapon: 1, // 1: AR, 2: Shotgun, 3: Sniper
            jumping: false,
            jumpHeight: 0,
            maxJumpHeight: 100
        };
        
        // Weapons
        this.weapons = {
            1: { name: "Assault Rifle", damage: 15, fireRate: 300, range: 300 },
            2: { name: "Shotgun", damage: 40, fireRate: 800, range: 100 },
            3: { name: "Sniper", damage: 80, fireRate: 1500, range: 500 }
        };
        
        // Enemies
        this.enemies = [];
        this.enemyCount = 19;
        this.totalPlayers = 20;
        
        // Items
        this.items = [];
        this.bullets = [];
        this.particles = [];
        
        // Controls
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.lastShot = 0;
        
        // Map
        this.map = {
            buildings: [],
            trees: [],
            chests: []
        };
        
        // Initialize
        this.setupControls();
        this.generateMap();
        this.spawnEnemies();
        this.spawnItems();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupControls() {
        // Keyboard Controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Weapon Switching
            if (e.key === '1') this.player.weapon = 1;
            if (e.key === '2') this.player.weapon = 2;
            if (e.key === '3') this.player.weapon = 3;
            if (e.key === 'r') this.reload();
            if (e.key === 'e') this.pickupItem();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse Controls
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.gameRunning && !this.gameOver) {
                this.shoot();
            }
        });
        
        // Prevent right-click menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    generateMap() {
        // Generate buildings
        for (let i = 0; i < 10; i++) {
            this.map.buildings.push({
                x: Math.random() * (this.canvas.width - 100),
                y: Math.random() * (this.canvas.height - 100),
                width: 80 + Math.random() * 100,
                height: 80 + Math.random() * 100,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
        }
        
        // Generate trees
        for (let i = 0; i < 20; i++) {
            this.map.trees.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 20 + Math.random() * 30
            });
        }
        
        // Generate chests
        for (let i = 0; i < 5; i++) {
            this.map.chests.push({
                x: Math.random() * (this.canvas.width - 50),
                y: Math.random() * (this.canvas.height - 50),
                opened: false
            });
        }
    }
    
    spawnEnemies() {
        for (let i = 0; i < this.enemyCount; i++) {
            this.enemies.push({
                id: i,
                x: Math.random() * (this.canvas.width - 50),
                y: Math.random() * (this.canvas.height - 50),
                width: 40,
                height: 60,
                health: 100,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                speed: 2 + Math.random() * 2,
                alive: true,
                targetX: Math.random() * this.canvas.width,
                targetY: Math.random() * this.canvas.height,
                lastMove: 0
            });
        }
    }
    
    spawnItems() {
        // Health packs
        for (let i = 0; i < 10; i++) {
            this.items.push({
                type: 'health',
                x: Math.random() * (this.canvas.width - 30),
                y: Math.random() * (this.canvas.height - 30),
                value: 25
            });
        }
        
        // Shield potions
        for (let i = 0; i < 10; i++) {
            this.items.push({
                type: 'shield',
                x: Math.random() * (this.canvas.width - 30),
                y: Math.random() * (this.canvas.height - 30),
                value: 25
            });
        }
        
        // Ammo boxes
        for (let i = 0; i < 15; i++) {
            this.items.push({
                type: 'ammo',
                x: Math.random() * (this.canvas.width - 30),
                y: Math.random() * (this.canvas.height - 30),
                value: 15
            });
        }
    }
    
    updatePlayer() {
        // Movement
        let dx = 0, dy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) dy -= this.player.speed;
        if (this.keys['s'] || this.keys['arrowdown']) dy += this.player.speed;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= this.player.speed;
        if (this.keys['d'] || this.keys['arrowright']) dx += this.player.speed;
        
        // Jumping
        if (this.keys[' '] && !this.player.jumping) {
            this.player.jumping = true;
        }
        
        if (this.player.jumping) {
            this.player.jumpHeight += 5;
            dy -= 5;
            if (this.player.jumpHeight >= this.player.maxJumpHeight) {
                this.player.jumping = false;
                this.player.jumpHeight = 0;
            }
        }
        
        // Apply movement with collision detection
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // Boundary check
        if (newX > 0 && newX < this.canvas.width - this.player.width) {
            this.player.x = newX;
        }
        if (newY > 0 && newY < this.canvas.height - this.player.height) {
            this.player.y = newY;
        }
    }
    
    updateEnemies() {
        const now = Date.now();
        
        for (let enemy of this.enemies) {
            if (!enemy.alive) continue;
            
            // Move randomly
            if (now - enemy.lastMove > 2000) {
                enemy.targetX = Math.random() * this.canvas.width;
                enemy.targetY = Math.random() * this.canvas.height;
                enemy.lastMove = now;
            }
            
            // Move toward target
            const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
            
            // Keep in bounds
            enemy.x = Math.max(0, Math.min(this.canvas.width - enemy.width, enemy.x));
            enemy.y = Math.max(0, Math.min(this.canvas.height - enemy.height, enemy.y));
            
            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                this.player.health -= 2;
                if (this.player.health <= 0) {
                    this.gameOver = true;
                }
            }
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Move bullet
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            
            // Check bounds
            if (bullet.x < 0 || bullet.x > this.canvas.width || 
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check enemy collision
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (enemy.alive && this.checkPointCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage;
                    
                    // Create hit effect
                    this.particles.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        color: '#ff4757',
                        life: 20,
                        size: 5 + Math.random() * 10
                    });
                    
                    if (enemy.health <= 0) {
                        enemy.alive = false;
                        this.player.kills++;
                        this.totalPlayers--;
                        
                        // Drop loot
                        this.items.push({
                            type: Math.random() > 0.5 ? 'health' : 'ammo',
                            x: enemy.x,
                            y: enemy.y,
                            value: Math.random() > 0.5 ? 25 : 15
                        });
                        
                        // Victory check
                        if (this.totalPlayers <= 1) {
                            this.victory = true;
                        }
                    }
                    
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    shoot() {
        const now = Date.now();
        const weapon = this.weapons[this.player.weapon];
        
        if (now - this.lastShot > weapon.fireRate && this.player.ammo > 0) {
            this.lastShot = now;
            this.player.ammo--;
            
            // Calculate angle to mouse
            const angle = Math.atan2(
                this.mouse.y - (this.player.y + this.player.height/2),
                this.mouse.x - (this.player.x + this.player.width/2)
            );
            
            // Create bullet
            this.bullets.push({
                x: this.player.x + this.player.width/2,
                y: this.player.y + this.player.height/2,
                angle: angle,
                speed: 15,
                damage: weapon.damage,
                range: weapon.range
            });
            
            // Muzzle flash
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: this.player.x + this.player.width/2 + Math.cos(angle) * 20,
                    y: this.player.y + this.player.height/2 + Math.sin(angle) * 20,
                    color: '#ffd700',
                    life: 10,
                    size: 2 + Math.random() * 3
                });
            }
            
            // Update HUD
            this.updateHUD();
        }
    }
    
    reload() {
        if (this.player.ammo < this.player.maxAmmo) {
            this.player.ammo = this.player.maxAmmo;
            this.updateHUD();
        }
    }
    
    pickupItem() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const distance = Math.sqrt(
                Math.pow(item.x - (this.player.x + this.player.width/2), 2) +
                Math.pow(item.y - (this.player.y + this.player.height/2), 2)
            );
            
            if (distance < 30) {
                if (item.type === 'health') {
                    this.player.health = Math.min(100, this.player.health + item.value);
                } else if (item.type === 'shield') {
                    this.player.shield = Math.min(100, this.player.shield + item.value);
                } else if (item.type === 'ammo') {
                    this.player.ammo = Math.min(this.player.maxAmmo, this.player.ammo + item.value);
                }
                
                this.items.splice(i, 1);
                this.updateHUD();
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    checkPointCollision(point, rect) {
        return point.x > rect.x && 
               point.x < rect.x + rect.width &&
               point.y > rect.y && 
               point.y < rect.y + rect.height;
    }
    
    updateHUD() {
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('shield').textContent = this.player.shield;
        document.getElementById('kills').textContent = this.player.kills;
        document.getElementById('ammo').textContent = this.player.ammo;
        document.getElementById('players').textContent = this.totalPlayers;
    }
    
    drawPlayer() {
        // Player body
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Player face (looking at mouse)
        this.ctx.fillStyle = '#ffffff';
        const faceX = this.player.x + this.player.width/2 + Math.cos(
            Math.atan2(this.mouse.y - (this.player.y + this.player.height/2), 
                      this.mouse.x - (this.player.x + this.player.width/2))
        ) * 20;
        const faceY = this.player.y + this.player.height/2 + Math.sin(
            Math.atan2(this.mouse.y - (this.player.y + this.player.height/2), 
                      this.mouse.x - (this.player.x + this.player.width/2))
        ) * 20;
        
        this.ctx.beginPath();
        this.ctx.arc(faceX, faceY, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Weapon indicator
        const weapon = this.weapons[this.player.weapon];
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(weapon.name, this.player.x, this.player.y - 10);
    }
    
    drawEnemies() {
        for (let enemy of this.enemies) {
            if (!enemy.alive) continue;
            
            // Enemy body
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Health bar
            this.ctx.fillStyle = '#ff4757';
            this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.health / 100), 5);
            
            // Enemy face
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/3, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawMap() {
        // Draw buildings
        for (let building of this.map.buildings) {
            this.ctx.fillStyle = building.color;
            this.ctx.fillRect(building.x, building.y, building.width, building.height);
            
            // Windows
            this.ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    this.ctx.fillRect(
                        building.x + 10 + i * 20,
                        building.y + 10 + j * 20,
                        10, 10
                    );
                }
            }
        }
        
        // Draw trees
        for (let tree of this.map.trees) {
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.beginPath();
            this.ctx.arc(tree.x, tree.y, tree.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(tree.x - 5, tree.y + tree.size/2, 10, 30);
        }
        
        // Draw chests
        for (let chest of this.map.chests) {
            this.ctx.fillStyle = chest.opened ? '#7f8c8d' : '#f1c40f';
            this.ctx.fillRect(chest.x, chest.y, 40, 30);
            
            if (!chest.opened) {
                this.ctx.fillStyle = '#d35400';
                this.ctx.fillRect(chest.x, chest.y, 40, 10);
            }
        }
    }
    
    drawItems() {
        for (let item of this.items) {
            this.ctx.beginPath();
            
            if (item.type === 'health') {
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.arc(item.x, item.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('❤️', item.x - 6, item.y + 5);
            } else if (item.type === 'shield') {
                this.ctx.fillStyle = '#3498db';
                this.ctx.arc(item.x, item.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('🛡️', item.x - 6, item.y + 5);
            } else if (item.type === 'ammo') {
                this.ctx.fillStyle = '#f1c40f';
                this.ctx.rect(item.x - 10, item.y - 10, 20, 20);
                this.ctx.fill();
                this.ctx.fillStyle = '#000000';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('🎯', item.x - 6, item.y + 5);
            }
        }
    }
    
    drawBullets() {
        for (let bullet of this.bullets) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Trail effect
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(
                bullet.x - Math.cos(bullet.angle) * 10,
                bullet.y - Math.sin(bullet.angle) * 10
            );
            this.ctx.lineTo(bullet.x, bullet.y);
            this.ctx.stroke();
        }
    }
    
    drawParticles() {
        for (let particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawCrosshair() {
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 2;
        
        // Crosshair lines
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
        this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
        this.ctx.stroke();
        
        // Outer circle
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 20, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map
        this.drawMap();
        
        // Draw items
        this.drawItems();
        
        // Draw enemies
        this.drawEnemies();
        
        // Draw bullets
        this.drawBullets();
        
        // Draw particles
        this.drawParticles();
        
        // Draw player
        this.drawPlayer();
        
        // Draw crosshair
        this.drawCrosshair();
        
        // Draw storm circle (shrinking over time)
        const stormRadius = Math.max(100, 400 - (Date.now() - this.startTime) / 10000);
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width/2, this.canvas.height/2, stormRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Show game status
        if (this.gameOver) {
            document.getElementById('gameOverScreen').style.display = 'flex';
            document.getElementById('gameOverStats').textContent = 
                `Kills: ${this.player.kills} | Survival Time: ${Math.floor((Date.now() - this.startTime) / 1000)}s`;
            this.gameRunning = false;
        }
        
        if (this.victory) {
            document.getElementById('victoryScreen').style.display = 'flex';
            document.getElementById('victoryStats').textContent = 
                `Victory Royale! Kills: ${this.player.kills}`;
            this.gameRunning = false;
        }
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.updatePlayer();
            this.updateEnemies();
            this.updateBullets();
            this.updateParticles();
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    start() {
        this.gameRunning = true;
        this.gameOver = false;
        this.victory = false;
        this.startTime = Date.now();
        document.getElementById('startScreen').style.display = 'none';
    }
}

// Game instance
let game;

function startGame() {
    game = new Fortnite2D();
    game.start();
}

function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('victoryScreen').style.display = 'none';
    startGame();
}

function toggleInstructions() {
    const instructions = document.getElementById('instructions');
    instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
}

// Initialize game on load
window.addEventListener('load', () => {
    console.log('🎮 Fortnite 2D Battle loaded!');
    console.log('Controls: WASD to move, Mouse to aim, Click to shoot');
});
