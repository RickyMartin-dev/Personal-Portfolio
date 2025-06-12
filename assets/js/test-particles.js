// Test file for particle system
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('testCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particleSystem = new ParticleSystem(canvas, 100);
    const mouseTracker = new MouseTracker();
    
    // UI Elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearBtn = document.getElementById('clearBtn');
    const particleCount = document.getElementById('particleCount');
    const countDisplay = document.getElementById('countDisplay');
    const fpsDisplay = document.getElementById('fpsDisplay');
    const particleDisplay = document.getElementById('particleDisplay');
    const mouseDisplay = document.getElementById('mouseDisplay');
    
    let isAnimating = false;
    let lastParticleTime = 0;
    
    function animate() {
        if (!isAnimating) return;
        
        const currentTime = performance.now();
        mouseTracker.update();
        
        // Add particles on mouse movement
        if (mouseTracker.isMoving && currentTime - lastParticleTime > 30) {
            particleSystem.addParticle(mouseTracker.x, mouseTracker.y);
            lastParticleTime = currentTime;
        }
        
        particleSystem.update(mouseTracker.x, mouseTracker.y, mouseTracker.getSpeed());
        particleSystem.draw();
        
        // Update UI
        const stats = particleSystem.getStats();
        fpsDisplay.textContent = stats.fps;
        particleDisplay.textContent = stats.particleCount;
        mouseDisplay.textContent = `${Math.round(mouseTracker.x)}, ${Math.round(mouseTracker.y)}`;
        
        requestAnimationFrame(animate);
    }
    
    // Event listeners
    startBtn.addEventListener('click', () => {
        isAnimating = true;
        particleSystem.start();
        animate();
    });
    
    stopBtn.addEventListener('click', () => {
        isAnimating = false;
        particleSystem.stop();
    });
    
    clearBtn.addEventListener('click', () => {
        particleSystem.clear();
    });
    
    particleCount.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        particleSystem.setMaxParticles(value);
        countDisplay.textContent = value;
    });
    
    // Auto-resize canvas
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particleSystem.resizeCanvas();
    });
    
    // Start automatically
    setTimeout(() => {
        startBtn.click();
    }, 100);
});