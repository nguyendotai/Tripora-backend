const COMBINING_MARKS_PATTERN = new RegExp(
  String.fromCharCode(0x5b) +
    String.fromCharCode(0x300) +
    '-' +
    String.fromCharCode(0x36f) +
    String.fromCharCode(0x5d),
  'g',
);

/** Chuyển chuỗi tiếng Việt có dấu thành slug kebab-case (vd: "Đà Nẵng" -> "da-nang"). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
