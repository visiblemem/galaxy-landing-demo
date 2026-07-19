const root = document.documentElement;
const hero = document.querySelector('.hero');
const nebulae = [...document.querySelectorAll('.nebula')];
const stars = [...document.querySelectorAll('.star-layer')];
const demoButton = document.getElementById('demoButton');
const demoModal = document.getElementById('demoModal');
const modalClose = document.getElementById('modalClose');

window.addEventListener('pointermove', (event) => {
  const x = event.clientX / window.innerWidth;
  const y = event.clientY / window.innerHeight;

  root.style.setProperty('--mx', `${x * 100}%`);
  root.style.setProperty('--my', `${y * 100}%`);

  nebulae.forEach((item, index) => {
    const depth = (index + 1) * 10;
    item.style.translate = `${(x - .5) * depth}px ${(y - .5) * depth}px`;
  });

  stars.forEach((item, index) => {
    const depth = (index + 1) * -7;
    item.style.marginLeft = `${(x - .5) * depth}px`;
    item.style.marginTop = `${(y - .5) * depth}px`;
  });
});

hero.addEventListener('pointermove', (event) => {
  const rect = hero.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  hero.style.transform = `perspective(1200px) rotateX(${y * -1.2}deg) rotateY(${x * 1.2}deg)`;
});

hero.addEventListener('pointerleave', () => {
  hero.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
});

demoButton.addEventListener('click', () => demoModal.showModal());
modalClose.addEventListener('click', () => demoModal.close());
demoModal.addEventListener('click', (event) => {
  const rect = demoModal.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) demoModal.close();
});
