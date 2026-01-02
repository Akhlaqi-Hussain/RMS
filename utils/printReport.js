// utils/printReport.js
import { restaurantInfo } from "./restaurantInfo";
import { formatJalaliDate, formatTime } from "./dateUtils";

export function printReport(data, columns, title) {
  if (!data || data.length === 0) return;

  // Define keys to sum for totals
  const summableKeys = [
    "total_orders",
    "total_sales",
    "total_discount",
    "net_sales",
    "total_qty",
    "net_income",
    "total_amount",
  ];

  const totals = {};
  summableKeys.forEach((key) => {
    totals[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  });

  // Format a single cell value according to column rules
  function renderValue(col, value, row) {
    switch (col.key) {
      case "date":
        return formatJalaliDate(value);
      case "total_sales":
      case "total_discount":
      case "net_sales":
      case "net_income":
        return `${formatCurrency(value)}`;
      case "total_qty":
        return formatNumber(value);
      case "sales_percentage":
        return `${formatNumber(value)}%`;
      case "total_amount":
        return `${formatCurrency(value)}`;
      case "status":
        switch (value) {
          case "cancelled":
            return `لغو شده`;
          case "closed":
            return `تکمیل شده`;
          case "open":
            return `باز`;
          default:
            return value ?? "";
        }
      default:
        return value ?? "";
    }
  }

  // Build table rows
  const rowsHTML = data
    .map(
      (row) => `
      <tr>
        ${columns
          .map((col) => `<td>${renderValue(col, row[col.key], row)}</td>`)
          .join("")}
      </tr>`
    )
    .join("");

  // Build totals row
  const totalsRow = `
    <tr class="totals-row">
      ${columns
        .map((col, i) =>
          i === 0
            ? "<td><strong>مجموع</strong></td>"
            : summableKeys.includes(col.key)
            ? `<td><strong>${
                col.key.includes("sales") || col.key.includes("income")
                  ? formatCurrency(totals[col.key])
                  : formatNumber(totals[col.key])
              }</strong></td>`
            : "<td></td>"
        )
        .join("")}
    </tr>
  `;

  // Open print window
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  const reportContent = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            margin: 0 auto;
            background: white;
            color: #000;
            line-height: 1.6;
            font-size: 14px;
            padding: 15mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            // border-bottom: 2px solid #000;
          }
          
          .restaurant-name { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          
          .report-title {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .report-info {
            font-size: 14px;
            margin-top: 8px;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
            font-size: 13px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 10px 8px;
            text-align: center;
          }
          
          th {
            background: #f5f5f5;
            font-weight: bold;
            font-size: 14px;
          }
          
          td {
            background: #fff;
          }
          
          tr:nth-child(even) td {
            background: #fafafa;
          }
          
          .totals-row {
            background: #e8e8e8;
            font-weight: bold;
            border-top: 2px solid #000;
          }
          
          .totals-row td {
            border-color: #000;
            font-size: 14px;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            // border-top: 2px solid #000;
            padding-top: 20px;
            font-size: 13px;
          }
          
          .footer div {
            margin-bottom: 5px;
          }
          
          .print-date {
            margin-top: 15px;
            color: #666;
          }
          
          /* Multi-page print styles */
          @media print {
            body { 
              margin: 0; 
              padding: 15mm;
            }
            
            .header {
              position: running(header);
            }
            
            .footer {
              position: running(footer);
            }
            
            table {
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            thead {
              display: table-header-group;
            }
            
            tfoot {
              display: table-footer-group;
            }
            
            @page {
              size: A4;
              margin: 15mm;
              
              @top-center {
                content: element(header);
              }
              
              @bottom-center {
                content: element(footer);
              }
              
              @bottom-left {
                content: "صفحه " counter(page);
                font-size: 12px;
                color: #666;
              }
              
              @bottom-right {
                content: "تعداد رکوردها: ${formatNumber(data.length)}";
                font-size: 12px;
                color: #666;
              }
            }
            
            @page :first {
              @top-center {
                content: "${restaurantInfo.name} - ${title}";
              }
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">${restaurantInfo.name}</div>
          <h2 class="report-title">${title}</h2>
          <div class="report-info">
            تاریخ چاپ: ${formatJalaliDate(new Date())} - ${formatTime(
    new Date()
  )}
          </div>
          <div class="report-info">
            تعداد رکوردها: ${formatNumber(data.length)} مورد
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${columns
                .map(
                  (col) =>
                    `<th>${col.header ?? col.key.replace(/_/g, " ")}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
            ${totalsRow}
          </tbody>
        </table>

        <div class="footer">
          <div>${restaurantInfo.phone}</div>
          <div>${restaurantInfo.address}</div>
          <div class="print-date">
            چاپ شده در ${formatJalaliDate(new Date())} ساعت ${formatTime(
    new Date()
  )}
          </div>
        </div>

        <script>
          function formatCurrency(amount) {
            return new Intl.NumberFormat('fa-IR').format(amount || 0) + ' ؋';
          }
          
          function formatNumber(num) {
            return new Intl.NumberFormat('fa-IR').format(num || 0);
          }
          
          window.onload = function() {
            window.print();
            setTimeout(() => {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(reportContent);
  printWindow.document.close();
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("fa-IR").format(amount || 0) + " ؋";
}

function formatNumber(num) {
  return new Intl.NumberFormat("fa-IR").format(num || 0);
}
