class MouseTracker {
    constructor(element = document) {
        this.x = 0;
        this.y = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isMoving = false;
        this.lastMoveTime = 0;
        
        this.bindEvents(element);
    }
    
    bindEvents(element) {
        element.addEventListener('mousemove', (e) => {
            this.prevX = this.x;
            this.prevY = this.y;
            
            if (e.touches) {
                // Touch event
                this.x = e.touches[0].clientX;
                this.y = e.touches[0].clientY;
            } else {
                // Mouse event
                this.x = e.clientX;
                this.y = e.clientY;
            }
            
            this.velocityX = this.x - this.prevX;
            this.velocityY = this.y - this.prevY;
            this.isMoving = true;
            this.lastMoveTime = Date.now();
        });
        
        // Touch events for mobile
        element.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.prevX = this.x;
            this.prevY = this.y;
            this.x = e.touches[0].clientX;
            this.y = e.touches[0].clientY;
            this.velocityX = this.x - this.prevX;
            this.velocityY = this.y - this.prevY;
            this.isMoving = true;
            this.lastMoveTime = Date.now();
        });
        
        // Stop tracking when mouse leaves
        element.addEventListener('mouseleave', () => {
            this.isMoving = false;
            this.velocityX = 0;
            this.velocityY = 0;
        });
    }
    
    update() {
        // If no movement for 100ms, consider stopped
        if (Date.now() - this.lastMoveTime > 100) {
            this.isMoving = false;
            this.velocityX *= 0.95;
            this.velocityY *= 0.95;
        }
    }
    
    getSpeed() {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }
}