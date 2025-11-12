const canvas = document.getElementById("animation");
const context = canvas.getContext("2d");

// Nombre total de frames
const frameCount = 120; // à adapter à ton animation
const images = [];
let currentFrame = 0;

function preloadImages() {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = `images/frames/${String(i).padStart(4, '0')}.webp`;
    images.push(img);
  }
}

function updateImage(index) {
  const img = images[index];
  if (img.complete) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const maxScrollTop = document.body.scrollHeight - window.innerHeight;
  const scrollFraction = scrollTop / maxScrollTop;
  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * frameCount)
  );

  if (frameIndex !== currentFrame) {
    currentFrame = frameIndex;
    updateImage(currentFrame);
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateImage(currentFrame);
});

// Démarrage
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
preloadImages();
images[0].onload = () => updateImage(0);
