import { restaurantInfo } from "./restaurantInfo";
import { formatJalaliDate, formatTime } from "./dateUtils";

// Print Kitchen Bill
export function printKitchenBill(order, items) {
  const { order_id, table_no, created_at, note } = order;

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
    <html>
      <head>
        <title>نسخه آشپزخانه</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'SF Mono', 'Courier New', monospace; 
            direction: rtl; 
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
          .items-table th:first-child { text-align: right; }
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
            <div class="restaurant-name">${restaurantInfo.name}</div>
            <p>شماره: <strong>${restaurantInfo.prefix}-${order_id}</strong></p>
            <p>میز: <strong>${table_no}</strong></p>
            <p>${formatJalaliDate(created_at)}</p>
            <p>${formatTime(created_at)}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>تعداد</th>
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
                  <td class="item-qty">${formatNumber(item.qty)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          ${
            note
              ? `<div style="margin-bottom: 5px;">توضیحات سفارش: ${note}</div>`
              : ""
          }
          
          <div class="footer">
            <div class="contact-info">
              <div>${restaurantInfo.phone}</div>
              <div>${restaurantInfo.address}</div>
            </div>
          </div>
        </div>

        <script>
          function formatNumber(num) {
            return new Intl.NumberFormat('fa-IR').format(num);
          }
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
export function printCustomerBill(order, items, bill) {
  const { order_id, table_no } = order;
  const { subtotal, discount, total_amount, created_at } = bill;

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
    <html>
      <head>
        <title>فاکتور سفارش</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'SF Mono', 'Courier New', monospace; 
            direction: rtl; 
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
          .items-table th:first-child { text-align: right; }
          .items-table th:last-child { text-align: left; }
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
            <div class="restaurant-name">${restaurantInfo.name}</div>
            <p>سفارش: <strong>${restaurantInfo.prefix}-${order_id}</strong></p>
            <p>${formatJalaliDate(created_at)}</p>
            <p>${formatTime(created_at)}</p>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>تعداد</th>
                <th>قیمت</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td style="text-align: right;">${
                    item.menu_item || item.menu_item_id
                  }</td>
                  <td style="text-align: center;">${formatNumber(item.qty)}</td>
                  <td style="text-align: center;">${formatNumber(
                    item.price
                  )}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>جمع کل:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${
              discount > 0
                ? `
              <div class="total-row discount-row">
                <span>تخفیف:</span>
                <span>${formatCurrency(discount)}</span>
              </div>
            `
                : ""
            }
            <div class="total-row final">
              <span>مبلغ نهایی:</span>
              <span>${formatCurrency(total_amount)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="thank-you">با تشکر از انتخاب شما</div>
            <div class="contact-info">
              <div>${restaurantInfo.phone}</div>
              <div>${restaurantInfo.address}</div>
            </div>
          </div>
        </div>

        <script>
          function formatCurrency(amount) {
            return new Intl.NumberFormat('fa-IR').format(amount) + ' ؋';
          }
          function formatNumber(num) {
            return new Intl.NumberFormat('fa-IR').format(num);
          }
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

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("fa-IR").format(amount) + " ؋";
}

function formatNumber(num) {
  return new Intl.NumberFormat("fa-IR").format(num);
}
