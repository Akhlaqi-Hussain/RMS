import { restaurantInfo } from "./restaurantInfo";
import { translate } from "@/lib/i18n/translate";
import { getDir, getLangTag, normalizeLocale } from "@/lib/i18n/config";
import {
  formatDate,
  formatTime,
  formatNumber as fmtNumber,
  formatMoney,
} from "@/lib/i18n/format";

// I18N-01: printouts follow the user's language and text direction.
function printSettings(locale) {
  const loc = normalizeLocale(locale);
  const rtl = getDir(loc) === "rtl";
  return {
    loc,
    tr: (key, vars) => translate(loc, key, vars),
    dir: getDir(loc),
    lang: getLangTag(loc),
    start: rtl ? "right" : "left",
    end: rtl ? "left" : "right",
    font: rtl
      ? "Tahoma, 'Segoe UI', 'Noto Naskh Arabic', Arial, sans-serif"
      : "'SF Mono', 'Courier New', monospace",
    num: (n) => fmtNumber(n, loc),
    money: (n) => formatMoney(n, loc),
    date: (d) => formatDate(d, loc),
    time: (d) => formatTime(d, loc),
    restaurant: {
      name: translate(loc, "restaurant.name"),
      address: translate(loc, "restaurant.address"),
      phone: translate(loc, "restaurant.phone"),
    },
  };
}

// Print Kitchen Bill
export function printKitchenBill(order, items, locale) {
  const { order_id, table_no, created_at, note } = order;
  const p = printSettings(locale);

  const baseHeight = 350;
  const itemHeight = 40;
  const calculatedHeight = baseHeight + items.length * itemHeight;

  const printWindow = window.open(
    "",
    "_blank",
    `width=320,height=${calculatedHeight}`
  );

  const kitchenContent = `
    <!DOCTYPE html>
    <html lang="${p.lang}" dir="${p.dir}">
      <head>
        <title>${p.tr("print.kitchenTitle")}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: ${p.font}; 
            direction: ${p.dir}; 
            width: 300px; 
            margin: 0 auto; 
            padding: 20px; 
            font-size: 14px; 
            line-height: 1.4; 
            background: white; 
            color: #000; 
          }
          .receipt { border: 2px solid #000; padding: 20px; border-radius: 8px; }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
            border-bottom: 3px double #000; 
          }
          .restaurant-name { 
            font-size: 22px; 
            font-weight: 800; 
            margin-bottom: 8px; 
            letter-spacing: -0.5px; 
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          .items-table thead { border-bottom: 2px solid #000; }
          .items-table th { 
            padding: 12px 5px; 
            font-weight: 700; 
            text-align: center; 
            font-size: 15px; 
          }
          .items-table th:first-child { text-align: ${p.start}; }
          .items-table td { 
            padding: 10px 5px; 
            border-bottom: 1px solid #eee; 
            vertical-align: top; 
            font-size: 14px; 
          }
          .items-table tr:last-child td { border-bottom: none; }
          .item-name { font-weight: 600; }
          .item-qty { font-weight: 700; text-align: center; }
          .footer { 
            text-align: center; 
            margin-top: 25px; 
            padding-top: 15px; 
            border-top: 3px double #000; 
            font-size: 14px; 
          }
          .contact-info { line-height: 1.6; }
          @media print { 
            body { padding: 0; }
            .receipt { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="restaurant-name">${p.restaurant.name}</div>
            <p>${p.tr("print.number")} <strong>${restaurantInfo.prefix}-${order_id}</strong></p>
            <p>${p.tr("print.table")} <strong>${table_no}</strong></p>
            <p>${p.date(created_at)}</p>
            <p>${p.time(created_at)}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>${p.tr("print.name")}</th>
                <th>${p.tr("print.qty")}</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td class="item-name">${
                    item.menu_item || item.menu_item_id
                  }</td>
                  <td class="item-qty">${p.num(item.qty)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          ${
            note
              ? `<div style="margin-bottom: 5px;">${p.tr("print.orderNote")} ${note}</div>`
              : ""
          }
          
          <div class="footer">
            <div class="contact-info">
              <div dir="ltr">${p.restaurant.phone}</div>
              <div>${p.restaurant.address}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(kitchenContent);
  //   printWindow.document.close();
}

// Print Customer Bill
export function printCustomerBill(order, items, bill, locale) {
  const { order_id, table_no } = order;
  const { subtotal, discount, total_amount, created_at } = bill;
  const p = printSettings(locale);

  const baseHeight = 400;
  const itemHeight = 35;
  const customerInfoHeight = table_no ? 40 : 0;
  const calculatedHeight =
    baseHeight + items.length * itemHeight + customerInfoHeight;

  const printWindow = window.open(
    "",
    "_blank",
    `width=320,height=${calculatedHeight}`
  );

  const billContent = `
    <!DOCTYPE html>
    <html lang="${p.lang}" dir="${p.dir}">
      <head>
        <title>${p.tr("print.billTitle")}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: ${p.font}; 
            direction: ${p.dir}; 
            width: 300px; 
            margin: 0 auto; 
            padding: 20px; 
            font-size: 12px; 
            line-height: 1.4; 
            background: white; 
            color: #000; 
          }
          .receipt { border: 2px solid #000; padding: 20px; border-radius: 8px; }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
            border-bottom: 3px double #000; 
          }
          .restaurant-name { 
            font-size: 22px; 
            font-weight: 800; 
            margin-bottom: 8px; 
            letter-spacing: -0.5px; 
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          .items-table thead { border-bottom: 2px solid #000; }
          .items-table th { 
            padding: 10px 5px; 
            font-weight: 700; 
            text-align: center; 
          }
          .items-table th:first-child { text-align: ${p.start}; }
          .items-table th:last-child { text-align: ${p.end}; }
          .items-table td { 
            padding: 8px 5px; 
            border-bottom: 1px solid #eee; 
            vertical-align: top; 
          }
          .items-table tr:last-child td { border-bottom: none; }
          .totals { 
            background: #f8f8f8; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0; 
            border: 1px solid #ddd; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
            padding-bottom: 8px; 
            border-bottom: 1px solid #ddd; 
          }
          .total-row:last-child { 
            border-bottom: none; 
            margin-bottom: 0; 
            padding-bottom: 0; 
            font-weight: 700; 
            font-size: 16px; 
          }
          .total-row.final { 
            border-top: 2px solid #000; 
            padding-top: 10px; 
            margin-top: 10px; 
            font-weight: 800; 
          }
          .discount-row { color: #d00; }
          .footer { 
            text-align: center; 
            margin-top: 25px; 
            padding-top: 15px; 
            border-top: 3px double #000; 
            font-size: 13px; 
          }
          .thank-you { 
            font-weight: 700; 
            margin-bottom: 10px; 
            font-size: 15px; 
          }
          .contact-info { line-height: 1.6; }
          @media print { 
            body { padding: 0; }
            .receipt { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="restaurant-name">${p.restaurant.name}</div>
            <p>${p.tr("print.order")} <strong>${restaurantInfo.prefix}-${order_id}</strong></p>
            <p>${p.date(created_at)}</p>
            <p>${p.time(created_at)}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>${p.tr("print.name")}</th>
                <th>${p.tr("print.qty")}</th>
                <th>${p.tr("print.price")}</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td style="text-align: ${p.start};">${
                    item.menu_item || item.menu_item_id
                  }</td>
                  <td style="text-align: center;">${p.num(item.qty)}</td>
                  <td style="text-align: center;">${p.num(item.price)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>${p.tr("print.subtotal")}</span>
              <span>${p.money(subtotal)}</span>
            </div>
            ${
              discount > 0
                ? `
              <div class="total-row discount-row">
                <span>${p.tr("print.discount")}</span>
                <span>${p.money(discount)}</span>
              </div>
            `
                : ""
            }
            <div class="total-row final">
              <span>${p.tr("print.finalAmount")}</span>
              <span>${p.money(total_amount)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="thank-you">${p.tr("print.thankYou")}</div>
            <div class="contact-info">
              <div dir="ltr">${p.restaurant.phone}</div>
              <div>${p.restaurant.address}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(billContent);
  printWindow.document.close();
}
