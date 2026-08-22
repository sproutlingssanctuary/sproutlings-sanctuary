export function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#FF6B6B','#3A8C6E','#FFB800','#00BCD4','#E91E63','#5BAD5B','#FF9500','#9B8EC4'];
  const particles = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2, y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 1) * 16 - 2,
    size: Math.random() * 7 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 360, rotSpd: (Math.random() - 0.5) * 12,
    life: 1,
  }));

  function frame() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.28;
      p.vx *= 0.99; p.rot += p.rotSpd; p.life -= 0.012;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot * Math.PI / 180);
      c.fillStyle = p.color;
      c.globalAlpha = Math.max(0, p.life);
      c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      c.restore();
    });
    alive ? requestAnimationFrame(frame) : canvas.remove();
  }
  frame();
}
