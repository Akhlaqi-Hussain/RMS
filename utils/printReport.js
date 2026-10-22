// utils/printReport.js
import { translate } from "@/lib/i18n/translate";
import { getDir, getLangTag, normalizeLocale } from "@/lib/i18n/config";
import {
  formatDate,
  formatTime,
  formatNumber as fmtNumber,
  formatMoney,
} from "@/lib/i18n/format";

// I18N-01: the printed report follows the user's language and text direction.
export function printReport(data, columns, title, locale) {
  if (!data || data.length === 0) return;

  const loc = normalizeLocale(locale);
  const tr = (key, vars) => translate(loc, key, vars);
  const dir = getDir(loc);
  const lang = getLangTag(loc);
  const formatCurrency = (amount) => formatMoney(amount || 0, loc);
  const formatNumber = (num) => fmtNumber(num || 0, loc);
  const restaurant = {
    name: tr("restaurant.name"),
    address: tr("restaurant.address"),
    phone: tr("restaurant.phone"),
  };
  const now = new Date();

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
        return formatDate(value, loc);
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
            return tr("reports.statusCancelled");
          case "closed":
            return tr("reports.statusClosed");
          case "open":
            return tr("reports.statusOpen");
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
            ? `<td><strong>${tr("common.total")}</strong></td>`
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
    <html lang="${lang}" dir="${dir}">
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
            direction: ${dir};
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
                content: "${tr("print.page")} " counter(page);
                font-size: 12px;
                color: #666;
              }
              
              @bottom-right {
                content: "${tr("print.recordCount", { count: formatNumber(data.length) })}";
                font-size: 12px;
                color: #666;
              }
            }
            
            @page :first {
              @top-center {
                content: "${restaurant.name} - ${title}";
              }
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">${restaurant.name}</div>
          <h2 class="report-title">${title}</h2>
          <div class="report-info">
            ${tr("print.printDate", { date: formatDate(now, loc), time: formatTime(now, loc) })}
          </div>
          <div class="report-info">
            ${tr("print.recordCount", { count: formatNumber(data.length) })}
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
          <div dir="ltr">${restaurant.phone}</div>
          <div>${restaurant.address}</div>
          <div class="print-date">
            ${tr("print.printedAt", { date: formatDate(now, loc), time: formatTime(now, loc) })}
          </div>
        </div>

        <script>
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
