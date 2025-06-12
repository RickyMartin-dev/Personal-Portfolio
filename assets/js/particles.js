class Particle {
    constructor(x = 0, y = 0) {
        this.reset(x, y);
    }
    
    reset(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.005;
        this.color = {
            r: Math.random() * 100 + 155,
            g: Math.random() * 100 + 155,
            b: 255
        };
        this.isDead = false;
    }
    
    update(mouseX, mouseY, mouseSpeed) {
        // Mouse influence
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
            const force = (100 - distance) / 100;
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * force * 0.5;
            this.vy += Math.sin(angle) * force * 0.5;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Apply friction
        this.vx *= 0.99;
        this.vy *= 0.99;
        
        // Update life
        this.life -= this.decay;
        if (this.life <= 0) {
            this.isDead = true;
        }
        
        // Size based on life
        this.currentSize = this.size * this.life;
    }
    
    draw(ctx) {
        if (this.isDead) return;
        
        ctx.save();
        ctx.globalAlpha = this.life * 0.6;
        
        // Create gradient
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentSize * 2
        );
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`);
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(canvas, maxParticles = 100) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = maxParticles;
        this.particlePool = [];
        this.isRunning = false;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsTime = 0;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }
    
    getParticle() {
        return this.particlePool.pop() || new Particle();
    }
    
    releaseParticle(particle) {
        this.particlePool.push(particle);
    }
    
    addParticle(x, y) {
        if (this.particles.length < this.maxParticles) {
            const particle = this.getParticle();
            particle.reset(x, y);
            this.particles.push(particle);
        }
    }
    
    update(mouseX, mouseY, mouseSpeed) {
        const currentTime = performance.now();
        
        // Calculate FPS
        this.frameCount++;
        if (currentTime - this.lastFpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsTime));
            this.frameCount = 0;
            this.lastFpsTime = currentTime;
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(mouseX, mouseY, mouseSpeed);
            
            if (particle.isDead) {
                this.particles.splice(i, 1);
                this.releaseParticle(particle);
            }
        }
        
        this.lastTime = currentTime;
    }
    
    draw() {
        // Clear with slight trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw particles
        for (const particle of this.particles) {
            particle.draw(this.ctx);
        }
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    clear() {
        this.particles.length = 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());
    }
    
    setMaxParticles(count) {
        this.maxParticles = count;
    }
    
    getStats() {
        return {
            fps: this.fps,
            particleCount: this.particles.length,
            poolSize: this.particlePool.length
        };
    }
}