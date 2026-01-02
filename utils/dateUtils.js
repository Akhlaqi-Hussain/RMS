import jalaali from "jalaali-js";

export function formatJalaliDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  // Convert to Jalali
  const { jy, jm, jd } = jalaali.toJalaali(date);

  // Dari (Solar Hijri) month names
  const months = [
    "حمل",
    "ثور",
    "جوزا",
    "سرطان",
    "اسد",
    "سنبله",
    "میزان",
    "عقرب",
    "قوس",
    "جدی",
    "دلو",
    "حوت",
  ];

  // Dari weekdays
  const weekdays = [
    "يک‌شنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه",
    "شنبه",
  ];

  const weekday = weekdays[date.getDay()];
  const month = months[jm - 1];

  return `${weekday}، ${jd} ${month} ${jy}`;
}

// dateUtils.js
export function formatTime(dateString) {
  return new Intl.DateTimeFormat("fa-AF", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(dateString));
}
