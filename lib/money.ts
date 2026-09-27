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
  let phone = normalizeDigits(value).trim();
  if (phone.startsWith("rishe_")) phone = phone.slice(6);
  phone = phone.replace(/[^0-9+]/g, "");
  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("98") && phone.length === 12) phone = "0" + phone.slice(2);
  else if (phone.startsWith("9") && phone.length === 10) phone = "0" + phone;
  return phone;
}

export function validIranPhone(value: string) {
  return /^09\d{9}$/.test(normalizePhone(value));
}
