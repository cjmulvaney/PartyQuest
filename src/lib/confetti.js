const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE156', '#FF8A5C', '#A78BFA', '#F472B6']

export function fireConfetti(duration = 2000) {
  const container = document.createElement('div')
  container.className = 'confetti-container'
  document.body.appendChild(container)

  const count = 40
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div')
    piece.className = 'confetti-piece'
    piece.style.left = Math.random() * 100 + '%'
    piece.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    piece.style.width = (Math.random() * 8 + 6) + 'px'
    piece.style.height = (Math.random() * 8 + 6) + 'px'
    piece.style.animationDuration = (Math.random() * 1.5 + 1) + 's'
    piece.style.animationDelay = Math.random() * 0.5 + 's'
    if (Math.random() > 0.5) piece.style.borderRadius = '50%'
    container.appendChild(piece)
  }

  setTimeout(() => container.remove(), duration + 500)
}
