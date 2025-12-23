export function generateAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=6366f1&color=ffffff`;
}
