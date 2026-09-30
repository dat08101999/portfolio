const dialog = document.getElementById('screen-dialog');
const dialogImage = document.getElementById('dialog-image');
let previousFocus;
document.querySelectorAll('[data-full]').forEach(button => {
  button.addEventListener('click', () => {
    previousFocus = button;
    dialogImage.src = button.dataset.full;
    dialogImage.alt = button.querySelector('img').alt;
    document.getElementById('dialog-caption').textContent = button.dataset.caption;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector('button').focus();
  });
});
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {
  if (e.target.classList.contains('dialog-image-wrap')) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  previousFocus?.focus({ preventScroll: true });
});
let toastTimeout;
document.getElementById('copy-email').addEventListener('click', async () => {
  const toast = document.getElementById('toast');
  try {
    await navigator.clipboard.writeText('thedat08101999@gmail.com');
    toast.textContent = 'Email copied. Say hello!';
  } catch {
    toast.textContent = 'thedat08101999@gmail.com';
  }
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
});
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-tilt-stage]').forEach(stage => {
  stage.addEventListener('pointermove', e => {
    if (reduceMotion.matches || e.pointerType !== 'mouse') return;
    const bounds = stage.getBoundingClientRect();
    stage.style.setProperty('--tilt-x', `${((e.clientY - bounds.top) / bounds.height - .5) * -5}deg`);
    stage.style.setProperty('--tilt-y', `${((e.clientX - bounds.left) / bounds.width - .5) * 6}deg`);
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
  });
});
