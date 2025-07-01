// Utility to validate Israeli ID numbers
// Returns true if valid, false otherwise
export function isValidIsraeliId(id: string): boolean {
  // Remove non-digits
  id = String(id).replace(/\D/g, '');
  if (id.length > 9 || id.length < 5) return false;
  // Pad with zeros to 9 digits
  id = id.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(id[i]) * ((i % 2) + 1);
    if (num > 9) num -= 9;
    sum += num;
  }
  return sum % 10 === 0;
} 