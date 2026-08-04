// Builds helmet_tracking.docx — "Shachar" helmet distribution tracking for Battalion 28 (Hebrew, RTL)
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle,
  LevelFormat, PageBreak,
} = require('docx');

const FONT = 'Arial';
const RED = '9E1B1B';
const LIGHT = 'F2DCDC';
const GREY = 'F2F2F2';

function rtl(text, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align || AlignmentType.RIGHT,
    heading: opts.heading,
    spacing: opts.spacing || { after: 120 },
    numbering: opts.numbering,
    children: [new TextRun({
      text,
      font: FONT,
      rightToLeft: true,
      bold: opts.bold || false,
      size: opts.size,
      color: opts.color,
    })],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: 'center',
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({
        text: String(text),
        font: FONT,
        rightToLeft: true,
        bold: opts.bold || false,
        color: opts.color,
        size: 22,
      })],
    })],
  });
}

// Rows are written left-to-right in code; visuallyRightToLeft flips display.
function table(colWidths, rows) {
  return new Table({
    visuallyRightToLeft: true,
    columnWidths: colWidths,
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: rows.map((r, i) => new TableRow({
      children: r.map((c, j) => cell(c.text !== undefined ? c.text : c, {
        width: colWidths[j],
        fill: i === 0 ? RED : (c.fill || (i % 2 === 0 ? GREY : undefined)),
        bold: i === 0 || c.bold,
        color: i === 0 ? 'FFFFFF' : c.color,
      })),
    })),
  });
}

const numbering = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: '•',
      alignment: AlignmentType.RIGHT,
      style: { paragraph: { indent: { left: 360, hanging: 260 } } },
    }],
  }],
};

const H1 = { heading: HeadingLevel.HEADING_1, bold: true, spacing: { before: 240, after: 120 } };
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: RED },
        paragraph: { spacing: { before: 280, after: 140 } } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children: [
      // ---- Title ----
      new Paragraph({
        bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: 'מעקב חלוקת קסדות "שחר" — גדוד 28', font: FONT, rightToLeft: true, bold: true, size: 40, color: RED })],
      }),
      new Paragraph({
        bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RED, space: 6 } },
        children: [new TextRun({ text: 'מסמך ריכוז נתונים | נכון לתאריך 6.1.2026', font: FONT, rightToLeft: true, size: 24 })],
      }),

      // ---- 1. Background ----
      rtl('1. רקע', H1),
      rtl('בתאריך 18.9.2025 הופצה פקודת חלוקת ציוד לחימה וקסדות "שחר" לביצוע בתאריך 25.9.2025. על פי טבלת החלוקה החטיבתית, גדוד 28 אמור היה לקבל בסך הכול 482 יח\' קסדות טקטיות בשתי פעימות:'),
      table([3500, 2500, 3000], [
        ['פעימה', 'כמות מתוכננת (יח\')', 'מקור'],
        ['פעימה א\' — 25.9.2025', '275', 'פקודת חלוקה 18.9.2025'],
        ['פעימה ב\' — סוף ספטמבר', '207', 'פילוח פעימה ב\' בפקודה'],
        [{ text: 'סה"כ מתוכנן', bold: true }, { text: '482', bold: true }, { text: '—', fill: LIGHT }],
      ]),
      rtl('', { spacing: { after: 60 } }),

      // ---- 2. Actual distribution ----
      rtl('2. חלוקה בפועל', H1),
      rtl('פעימה א\' (25.9.2025): התקבלו 275 יח\' — בהתאם למתוכנן.', { numbering: { reference: 'bullets', level: 0 } }),
      rtl('פעימה ב\' (29.9.2025): ניתנה פקודה חדשה לחלוקת קסדות פעימה ב\' למפ"מ, במסגרתה הוקצו לגדוד 28 סך של 123 יח\' בלבד (חלף 207 יח\' שתוכננו בפקודה המקורית). בפועל חולקו 123 יח\'.', { numbering: { reference: 'bullets', level: 0 } }),
      table([4500, 2500], [
        ['נתון', 'כמות (יח\')'],
        ['התקבל בפעימה א\'', '275'],
        ['התקבל בפעימה ב\'', '123'],
        [{ text: 'סה"כ קסדות "שחר" בגדוד', bold: true }, { text: '398', bold: true }],
        [{ text: 'פער מול התכנון המקורי (482 יח\')', bold: true }, { text: '84', bold: true, color: RED }],
      ]),
      rtl('', { spacing: { after: 60 } }),

      // ---- 3. Inventory count ----
      rtl('3. ספירת מלאי — 6.1.2026', H1),
      rtl('בתאריך 6.1.2026 בוצעה ספירת תיקים בימ"ח. במסגרת הספירה נספרו 291 קסדות בתיקים, ובנוסף קיימות 15 יח\' במלאי הימ"ח. כמו כן ביצע הגדוד וידוא לקסדות הנמצאות מחוץ לימ"ח, בפילוח הבא:'),
      table([3500, 3000], [
        ['גורם', 'קסדות מחוץ לימ"ח (יח\')'],
        ['פלוגה א\'', '15'],
        ['פלוגה ב\'', '3'],
        ['פלוגה ג\'', '5'],
        ['מסייעת', '11'],
        ['פתן', '5'],
        ['פלס"מ', '20'],
        [{ text: 'סה"כ מחוץ לימ"ח', bold: true }, { text: '59', bold: true }],
      ]),
      rtl('', { spacing: { after: 60 } }),

      // ---- 4. Summary ----
      new Paragraph({ children: [new PageBreak()] }),
      rtl('4. ריכוז ומאזן', H1),
      table([5500, 2500], [
        ['נתון', 'כמות (יח\')'],
        ['סה"כ קסדות שהתקבלו בגדוד (שתי פעימות)', '398'],
        ['נספרו בספירת תיקים בימ"ח (6.1.2026)', '291'],
        ['מלאי ימ"ח', '15'],
        ['מאומתות מחוץ לימ"ח (פלוגות)', '59'],
        [{ text: 'סה"כ קסדות שנספרו ומיקומן ידוע', bold: true }, { text: '365', bold: true }],
        [{ text: 'פער — קסדות שמיקומן טרם אומת', bold: true }, { text: '33', bold: true, color: RED }],
      ]),
      rtl('', { spacing: { after: 60 } }),

      // ---- 5. Notes ----
      rtl('5. הערות והמשך טיפול', H1),
      rtl('הקצאת פעימה ב\' בפקודה מיום 29.9.2025 (123 יח\') נמוכה ב-84 יח\' מהפילוח המקורי (207 יח\') — הפער ברמה החטיבתית ואינו חוסר גדודי.', { numbering: { reference: 'bullets', level: 0 } }),
      rtl('סכימת הספירה: 291 בתיקים + 15 מלאי ימ"ח + 59 מחוץ לימ"ח = 365 יח\' שמיקומן ידוע.', { numbering: { reference: 'bullets', level: 0 } }),
      rtl('נדרש להמשיך באיתור 33 היח\' שמיקומן טרם אומת (398 שהתקבלו מול 365 ידועות).', { numbering: { reference: 'bullets', level: 0 } }),

      // ---- 6. Appendices ----
      new Paragraph({ children: [new PageBreak()] }),
      rtl('6. נספחים — אסמכתאות', H1),
      rtl('נספח א\' — פקודת חלוקת ציוד לחימה וקסדות שחר, 25.9.2025 (הופצה 18.9.2025)', { bold: true, spacing: { before: 120, after: 100 } }),
      rtl('שורת הקסדות הטקטיות מתוך טבלת החלוקה החטיבתית (שוחזר מצילום הפקודה):', { size: 20 }),
      table([2000, 1100, 1050, 1050, 1050, 1000, 1000, 1150], [
        ['פריט', 'גדס"ר 6623', 'גדוד 71', 'גדוד 66', 'גדוד 28', 'גדס"ם', 'פלת"צ', 'סה"כ'],
        ['קסדה טקטית — פעימה א\'', '387', '327', '192', { text: '275', bold: true }, '32', '42', '1255'],
        ['פילוח פעימה ב\' (סוף ספטמבר)', '45', '155', '290', { text: '207', bold: true }, '—', '—', '697'],
      ]),
      rtl('', { spacing: { after: 120 } }),
      rtl('נספח ב\' — פקודת חלוקת קסדות פעימה ב\', 29.9.2025 (הודעה מהקצין, מ"פ מילואים)', { bold: true, spacing: { before: 120, after: 100 } }),
      rtl('נוסח ההודעה כפי שהתקבלה (שוחזר מצילום השיחה, 29.9.2025 12:55):', { size: 20 }),
      table([4200, 2200], [
        ['גורם', 'הקצאה (יח\')'],
        ['גדס"ר', '40'],
        ['גד\' 66', '200'],
        [{ text: 'גד\' 28', bold: true }, { text: '123', bold: true }],
        ['גד\' 71', '130'],
        ['חפ"ק סמח"ט', '8'],
        ['חפ"ק מח"ט', '8'],
        ['מפח"ט', '16'],
        ['פלת"צ', '15'],
        ['פלחי"ק', '10'],
        ['להחזיר לדין', '147'],
      ]),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('helmet_tracking.docx', buf);
  console.log('wrote helmet_tracking.docx');
});
