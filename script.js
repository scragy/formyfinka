let highestZ = 1;
let activePaper = null;    // paper yang sedang di-drag (desktop)
let activeInstance = null; // instance Paper yang sedang aktif (desktop)

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

class Paper {
  constructor() {
    this.holdingPaper = false;
    this.startX = 0;
    this.startY = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.velX = 0;
    this.velY = 0;
    this.rotation = Math.random() * 30 - 15;
    this.scale = 1;
    this.currentPaperX = 0;
    this.currentPaperY = 0;
    this.rotating = false;
    // untuk gesture dua jari di HP
    this.startAngle = 0;
    this.startRotation = 0;
    this.startDist = 0;
    this.startScale = 1;
    this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
  }

  applyTransform(paper) {
    paper.style.transform =
      `translateX(${this.currentPaperX}px) translateY(${this.currentPaperY}px) rotateZ(${this.rotation}deg) scale(${this.scale})`;
  }

  clampScale(s) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  }

  touchAngle(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  touchDist(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.hypot(dx, dy);
  }

  init(paper) {
    if (this.isMobile) {
      // ===== MOBILE (touch) =====
      paper.addEventListener('touchstart', (e) => {
        // Dua jari: mulai rotasi + zoom (pinch)
        if (e.touches.length === 2) {
          this.rotating = true;
          this.holdingPaper = true;
          this.startAngle = this.touchAngle(e.touches);
          this.startRotation = this.rotation;
          this.startDist = this.touchDist(e.touches) || 1;
          this.startScale = this.scale;
          return;
        }

        if (this.holdingPaper) return;
        this.holdingPaper = true;
        paper.style.zIndex = highestZ++;
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
        this.prevX = this.startX;
        this.prevY = this.startY;
      }, { passive: false });

      paper.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!this.holdingPaper) return;

        // Dua jari: putar + zoom
        if (this.rotating && e.touches.length >= 2) {
          const angle = this.touchAngle(e.touches);
          this.rotation = this.startRotation + (angle - this.startAngle);
          this.scale = this.clampScale(
            this.startScale * (this.touchDist(e.touches) / this.startDist)
          );
          this.applyTransform(paper);
          return;
        }

        // Satu jari: geser
        if (!this.rotating && e.touches.length === 1) {
          this.moveX = e.touches[0].clientX;
          this.moveY = e.touches[0].clientY;
          this.velX = this.moveX - this.prevX;
          this.velY = this.moveY - this.prevY;
          this.currentPaperX += this.velX;
          this.currentPaperY += this.velY;
          this.prevX = this.moveX;
          this.prevY = this.moveY;
          this.applyTransform(paper);
        }
      }, { passive: false });

      paper.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          this.holdingPaper = false;
          this.rotating = false;
        } else if (e.touches.length === 1) {
          // tinggal satu jari: lanjut geser tanpa lompat
          this.rotating = false;
          this.prevX = e.touches[0].clientX;
          this.prevY = e.touches[0].clientY;
        }
      });

      paper.addEventListener('touchcancel', () => {
        this.holdingPaper = false;
        this.rotating = false;
      });

    } else {
      // ===== DESKTOP (mouse) =====
      paper.addEventListener('mousedown', (e) => {
        if (e.button !== 0 && e.button !== 2) return;

        activePaper = paper;
        activeInstance = this;
        this.holdingPaper = true;
        paper.style.zIndex = highestZ++;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.prevX = this.startX;
        this.prevY = this.startY;
        this.rotating = (e.button === 2);
      });

      paper.addEventListener('contextmenu', (e) => e.preventDefault());

      // Scroll mouse (atau pinch di touchpad) untuk zoom in/out
      paper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        this.scale = this.clampScale(this.scale * factor);
        this.applyTransform(paper);
      }, { passive: false });
    }
  }
}

// ===== Event global mouse =====
document.addEventListener('mousemove', (e) => {
  if (!activeInstance || !activeInstance.holdingPaper) return;

  const inst = activeInstance;

  if (inst.rotating) {
    const dirX = e.clientX - inst.startX;
    const dirY = e.clientY - inst.startY;
    if (dirX === 0 && dirY === 0) return;
    let degrees = Math.atan2(dirY, dirX) * 180 / Math.PI;
    degrees = (360 + Math.round(degrees)) % 360;
    inst.rotation = degrees;
  } else {
    inst.moveX = e.clientX;
    inst.moveY = e.clientY;
    inst.velX = inst.moveX - inst.prevX;
    inst.velY = inst.moveY - inst.prevY;
    inst.currentPaperX += inst.velX;
    inst.currentPaperY += inst.velY;
    inst.prevX = inst.moveX;
    inst.prevY = inst.moveY;
  }

  inst.applyTransform(activePaper);
});

document.addEventListener('mouseup', () => {
  if (activeInstance) {
    activeInstance.holdingPaper = false;
    activeInstance.rotating = false;
  }
  activePaper = null;
  activeInstance = null;
});

window.addEventListener('blur', () => {
  if (activeInstance) {
    activeInstance.holdingPaper = false;
    activeInstance.rotating = false;
  }
  activePaper = null;
  activeInstance = null;
});

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.paper').forEach((paper) => {
    const p = new Paper();
    p.init(paper);
  });

  // Musik: autoplay butuh interaksi pertama dari user
  const music = document.getElementById('bg-music');
  if (music) {
    const startMusic = () => {
      music.play().catch(() => {});
      document.removeEventListener('touchstart', startMusic);
      document.removeEventListener('click', startMusic);
    };
    document.addEventListener('touchstart', startMusic);
    document.addEventListener('click', startMusic);
  }
});