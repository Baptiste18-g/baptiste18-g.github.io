window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const headerHeight = window.innerHeight;
  const logo = document.getElementById('logo');

  // Progression entre 0 (haut de page) et 1 (haut de la section suivante)
  const progress = Math.min(scrollY / headerHeight, 1);

  // Taille du logo : de 1 à 0.4
  const scale = 1 - 0.6 * progress;

  // Déplacement vertical : du centre à la position top=20px
  const translateY = -progress * (window.innerHeight / 2 - 40);

  logo.style.transform = `translateY(${translateY}px) scale(${scale})`;
});
