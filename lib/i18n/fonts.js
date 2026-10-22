// OFF-1 / FONT-1: fonts are part of the app (public/fonts), so screens and
// printouts look the same without an internet connection.
// Dari & Pashto: Vazirmatn ("Vazir") first, Noto Sans Arabic as fallback
// (Noto also has the ؋ sign, which Vazirmatn does not), then Windows fonts.

export const RTL_FONT_STACK =
  '"Vazirmatn", "Noto Sans Arabic", Tahoma, "Segoe UI", Arial, sans-serif';

const NOTO_ARABIC_RANGE =
  "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC";

// @font-face rules for the print windows (they are separate pages, so they
// need the full address of the font files on this server).
export function rtlFontFaceCss(origin = "") {
  return `
    @font-face {
      font-family: "Vazirmatn";
      src: url("${origin}/fonts/Vazirmatn-wght.woff2") format("woff2");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Noto Sans Arabic";
      src: url("${origin}/fonts/NotoSansArabic-wght.woff2") format("woff2");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
      unicode-range: ${NOTO_ARABIC_RANGE};
    }`;
}

// Script for print windows: wait until the fonts are loaded, then print.
export const PRINT_WHEN_READY = (closeDelay) => `
          window.onload = function() {
            var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            ready.then(function() {
              window.print();
              setTimeout(function() { window.close(); }, ${closeDelay});
            });
          };`;
