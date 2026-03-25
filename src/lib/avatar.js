const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE156', '#A78BFA',
  '#F472B6', '#FF8A5C', '#34D399', '#60A5FA',
  '#FBBF24', '#818CF8', '#FB923C', '#2DD4BF',
]

export function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
