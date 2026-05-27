import { Router } from "express";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { EXCEL_MAX_SHEETS } from "../../shared/constants";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { products, includeDetails } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Данные товаров отсутствуют." });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "WB Parser";

    const mainWs = wb.addWorksheet("Товары");

    const headers = [
      "Артикул", "Бренд", "Название", "Цена без скидки", "Цена со скидкой",
      "Цена с WB кошельком", "Рейтинг", "Отзывы (кол-во)", "Остатки всего (шт)",
      "Детализация по складам", "Продавец", "ID Продавца", "Позиция в выдаче",
      "Реклама (Да/Нет)", "Срок доставки (Регион)", "Срок доставки (МСК)",
      "Ссылка на товар", "Ссылка на фото"
    ];

    const headerRow = mainWs.addRow(headers);
    headerRow.font = { name: "Calibri", size: 11, bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    products.forEach((p: any) => {
      mainWs.addRow([
        p.id, p.brand, p.name, p.priceOriginal, p.priceDiscounted,
        p.priceWallet, p.rating, p.feedbacks, p.totalStock,
        p.stocksDetail, p.supplier, p.supplierId, p.position || "",
        p.isPromo || "Нет", p.deliveryBy || "", p.deliveryMsk || "",
        p.itemUrl, p.imageUrl
      ]);
    });

    mainWs.autoFilter = { from: { row: 1, column: 1 }, to: { row: products.length + 1, column: headers.length } };

    mainWs.columns.forEach(col => { col.width = 15; });
    mainWs.getColumn(1).width = 12;
    mainWs.getColumn(3).width = 40;
    mainWs.getColumn(10).width = 45;
    mainWs.getColumn(17).width = 45;
    mainWs.getColumn(18).width = 55;
    mainWs.getRow(1).height = 22;

    if (includeDetails) {
      const maxSheets = Math.min(products.length, EXCEL_MAX_SHEETS);
      const HEADER_FONT = { name: "Calibri", size: 11, bold: true };
      const NORMAL_FONT = { name: "Calibri", size: 11 };

      for (let idx = 0; idx < maxSheets; idx++) {
        const p = products[idx];
        const nmId = p.id;
        const sheetName = `${idx + 1}`.slice(0, 31);
        const ws = wb.addWorksheet(sheetName);

        ws.getColumn(1).width = 12;
        ws.getColumn(2).width = 37.7;
        ws.getColumn(3).width = 25.29;
        ws.getColumn(4).width = 98;
        ws.getColumn(5).width = 5;
        ws.getColumn(6).width = 28.86;
        ws.getColumn(7).width = 46.14;

        const vol = Math.floor(nmId / 100000);
        const part = Math.floor(nmId / 1000);
        const imageUrl = `https://basket-${p.basket || "01"}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;

        try {
          const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
          if (imgResp.ok) {
            const webpBuffer = Buffer.from(await imgResp.arrayBuffer());
            const pngBuffer = await sharp(webpBuffer).png().toBuffer();
            const imgId = wb.addImage({ buffer: pngBuffer, extension: "png" });
            ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 160, height: 210 } });
          }
        } catch { /* image not available */ }

        ws.getCell("C1").value = "Поле";
        ws.getCell("C1").font = HEADER_FONT;
        ws.getCell("C1").alignment = { horizontal: "center", vertical: "top" };
        ws.getCell("D1").value = "Значение";
        ws.getCell("D1").font = HEADER_FONT;
        ws.getCell("D1").alignment = { horizontal: "center", vertical: "top" };

        const infoRows = [
          ["Артикул", String(nmId)],
          ["Название", p.name || ""],
          ["Бренд", p.brand || ""],
          ["Продавец", p.supplier || ""],
          ["Ссылка", p.itemUrl || ""],
          ["Итого Складских запасов", `${p.totalStock || 0} шт`],
          ["Детализация складов", p.stocksDetail || ""],
        ];

        infoRows.forEach(([label, value], i) => {
          const row = i + 2;
          ws.getCell(`C${row}`).value = label;
          ws.getCell(`C${row}`).font = HEADER_FONT;
          ws.getCell(`D${row}`).value = value;
          ws.getCell(`D${row}`).font = NORMAL_FONT;
        });

        const chars = p.characteristics;
        if (chars && Array.isArray(chars) && chars.length > 0) {
          ws.getCell("F2").value = "--- ХАРАКТЕРИСТИКИ ---";
          ws.getCell("F2").font = HEADER_FONT;

          chars.forEach((ch: any, i: number) => {
            const row = i + 3;
            ws.getCell(`F${row}`).value = ch.name || ch.Характеристика || "";
            ws.getCell(`F${row}`).font = HEADER_FONT;
            ws.getCell(`G${row}`).value = ch.value || ch.Значение || "";
            ws.getCell(`G${row}`).font = NORMAL_FONT;
          });
        } else {
          ws.getCell("F2").value = "Характеристики";
          ws.getCell("F2").font = HEADER_FONT;
          ws.getCell("G2").value = "Не найдены";
          ws.getCell("G2").font = NORMAL_FONT;
        }

        const desc = p.description;
        const lastContentRow = Math.max(infoRows.length + 1, (chars?.length || 0) + 3);
        const descRow = lastContentRow + 2;

        if (desc) {
          ws.getCell(`C${descRow}`).value = "ОПИСАНИЕ";
          ws.getCell(`C${descRow}`).font = HEADER_FONT;
          ws.getCell(`C${descRow}`).alignment = { vertical: "top" };
          ws.getCell(`D${descRow}`).value = desc;
          ws.getCell(`D${descRow}`).font = NORMAL_FONT;
          ws.getCell(`D${descRow}`).alignment = { wrapText: true, vertical: "top" };
          ws.getRow(descRow).height = 300;
        }
      }

      if (products.length > EXCEL_MAX_SHEETS) {
        console.log(`[Excel] Limited detail sheets to ${EXCEL_MAX_SHEETS} (had ${products.length} products)`);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=wb_parsing_results.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
