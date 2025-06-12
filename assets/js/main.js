// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('smokeCanvas');
  const particleSystem = new ParticleSystem(canvas, 150);
  const mouseTracker = new MouseTracker();
  
  let lastParticleTime = 0;
  const particleInterval = 50; // ms between particles
  
  function animate() {
      const currentTime = performance.now();
      
      mouseTracker.update();
      
      // Add particles based on mouse movement
      if (mouseTracker.isMoving && currentTime - lastParticleTime > particleInterval) {
          const speed = mouseTracker.getSpeed();
          if (speed > 2) {
              // Add more particles for faster movement
              const particleCount = Math.min(Math.floor(speed / 10) + 1, 5);
              for (let i = 0; i < particleCount; i++) {
                  const offsetX = (Math.random() - 0.5) * 20;
                  const offsetY = (Math.random() - 0.5) * 20;
                  particleSystem.addParticle(
                      mouseTracker.x + offsetX,
                      mouseTracker.y + offsetY
                  );
              }
              lastParticleTime = currentTime;
          }
      }
      
      particleSystem.update(mouseTracker.x, mouseTracker.y, mouseTracker.getSpeed());
      particleSystem.draw();
      
      requestAnimationFrame(animate);
  }
  
  // Start the system
  particleSystem.start();
  animate();
  
  // Adjust particle count based on device performance
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
      particleSystem.setMaxParticles(50);
  }
});