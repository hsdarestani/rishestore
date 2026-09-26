export function toman(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value) + " تومان";
}

export function faNumber(value: number | string) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function normalizePhone(value: string) {
  let phone = normalizeDigits(value).replace(/\s|-/g, "");
  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  return phone;
}

export function validIranPhone(value: string) {
  return /^09\d{9}$/.test(normalizePhone(value));
}
