import jsPDF from 'jspdf';

/**
 * Sanitizes text for safe use in jsPDF by replacing problematic Unicode characters
 * with safe ASCII equivalents.
 */
export const sanitizePdfText = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  
  let text = String(input);
  
  // Replace common problematic Unicode characters
  const replacements: [RegExp | string, string][] = [
    // Bullets and list markers
    [/•/g, '-'],
    [/◦/g, '-'],
    [/‣/g, '-'],
    [/⁃/g, '-'],
    [/●/g, '-'],
    [/○/g, '-'],
    [/■/g, '-'],
    [/□/g, '-'],
    [/▪/g, '-'],
    [/▫/g, '-'],
    
    // Math symbols
    [/×/g, 'x'],
    [/÷/g, '/'],
    [/±/g, '+/-'],
    [/≤/g, '<='],
    [/≥/g, '>='],
    [/≠/g, '!='],
    [/≈/g, '~'],
    [/∞/g, 'infinity'],
    
    // Quotes and apostrophes
    [/"/g, '"'],
    [/"/g, '"'],
    [/'/g, "'"],
    [/'/g, "'"],
    [/„/g, '"'],
    [/«/g, '"'],
    [/»/g, '"'],
    [/‹/g, "'"],
    [/›/g, "'"],
    
    // Dashes and spaces
    [/—/g, '-'],
    [/–/g, '-'],
    [/­/g, ''],
    [/ /g, ' '], // NBSP
    [/\u00A0/g, ' '],
    
    // Ellipsis
    [/…/g, '...'],
    
    // Arrows
    [/→/g, '->'],
    [/←/g, '<-'],
    [/↑/g, '^'],
    [/↓/g, 'v'],
    [/⇒/g, '=>'],
    [/⇐/g, '<='],
    
    // Checkmarks and crosses
    [/✓/g, '[v]'],
    [/✔/g, '[v]'],
    [/✗/g, '[x]'],
    [/✘/g, '[x]'],
    [/☑/g, '[v]'],
    [/☐/g, '[ ]'],
    [/☒/g, '[x]'],
    
    // Currency
    [/€/g, 'EUR'],
    [/£/g, 'GBP'],
    [/¥/g, 'JPY'],
    [/₹/g, 'INR'],
    
    // Other common symbols
    [/©/g, '(c)'],
    [/®/g, '(R)'],
    [/™/g, '(TM)'],
    [/°/g, ' deg'],
    [/µ/g, 'u'],
    [/¶/g, ''],
    [/§/g, 'S'],
    [/†/g, '*'],
    [/‡/g, '**'],
    
    // Fractions
    [/½/g, '1/2'],
    [/¼/g, '1/4'],
    [/¾/g, '3/4'],
    [/⅓/g, '1/3'],
    [/⅔/g, '2/3'],
  ];
  
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  
  // Remove any remaining non-Latin1 characters that could cause issues
  // Keep basic ASCII and extended Latin (Latin-1 Supplement)
  text = text.replace(/[^\x00-\xFF]/g, '');
  
  return text;
};

/**
 * Converts hex color to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 15, g: 23, b: 42 };
};

/**
 * Draw a vector checkmark instead of using unicode
 */
export const drawCheckmark = (pdf: jsPDF, x: number, y: number, size: number = 3, color: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }) => {
  pdf.setDrawColor(color.r, color.g, color.b);
  pdf.setLineWidth(0.5);
  // Draw a simple checkmark shape
  pdf.line(x - size * 0.5, y, x, y + size * 0.5);
  pdf.line(x, y + size * 0.5, x + size, y - size * 0.5);
};

/**
 * Draw a small bullet point circle
 */
export const drawBullet = (pdf: jsPDF, x: number, y: number, radius: number = 1, color: { r: number; g: number; b: number } = { r: 31, g: 41, b: 55 }) => {
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.circle(x, y - 1.5, radius, 'F');
};

interface RichTextOptions {
  startX: number;
  startY: number;
  maxWidth: number;
  pageHeight: number;
  margin: number;
  primaryColor: string;
  addPageHeader: (pdf: jsPDF) => void;
  isMonochrome?: boolean;
}

/**
 * Process text to identify important terms that should be bold
 * (company names, client info, headings, etc.)
 */
const processBoldText = (text: string): string => {
  // This function marks important terms - actual bold rendering
  // is handled in the renderRichText function
  return text;
};

/**
 * Parses and renders rich text content to PDF with proper styling
 */
export const renderRichText = (
  pdf: jsPDF,
  content: string,
  options: RichTextOptions
): number => {
  const { startX, startY, maxWidth, pageHeight, margin, primaryColor, addPageHeader, isMonochrome = false } = options;
  const primaryRgb = hexToRgb(primaryColor);
  
  let yPos = startY;
  const lineHeight = 6;
  const paragraphSpacing = 8;
  
  const sanitizedContent = sanitizePdfText(content);
  const lines = sanitizedContent.split('\n');
  
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos > pageHeight - requiredSpace - 20) {
      pdf.addPage();
      addPageHeader(pdf);
      yPos = 45;
    }
  };
  
  const setHeadingStyle = (level: number) => {
    const sizes = [16, 14, 12, 11];
    pdf.setFontSize(sizes[level] || 11);
    pdf.setFont('helvetica', 'bold');
    if (isMonochrome) {
      pdf.setTextColor(31, 41, 55);
    } else {
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    }
  };
  
  const setBodyStyle = () => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
  };

  /**
   * Renders text with inline bold/italic formatting
   * Supports **bold**, *italic*, and `code`
   */
  const renderFormattedText = (text: string, x: number, y: number, maxW: number): number => {
    // Parse inline formatting markers
    const segments: { text: string; bold: boolean; italic: boolean; code: boolean }[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      // Find the earliest match
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/\*([^*]+)\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      
      const matches: { match: RegExpMatchArray | null; type: 'bold' | 'italic' | 'code' }[] = [
        { match: boldMatch, type: 'bold' },
        { match: italicMatch, type: 'italic' },
        { match: codeMatch, type: 'code' },
      ];
      
      const validMatches = matches.filter(m => m.match !== null);
      
      if (validMatches.length === 0) {
        if (remaining.length > 0) {
          segments.push({ text: remaining, bold: false, italic: false, code: false });
        }
        break;
      }
      
      // Find earliest match by index
      let earliest = validMatches[0];
      for (const m of validMatches) {
        if (m.match && earliest.match && (m.match.index ?? Infinity) < (earliest.match.index ?? Infinity)) {
          earliest = m;
        }
      }
      
      if (!earliest.match) {
        segments.push({ text: remaining, bold: false, italic: false, code: false });
        break;
      }
      
      const matchIndex = earliest.match.index ?? 0;
      
      // Add text before match
      if (matchIndex > 0) {
        segments.push({ text: remaining.slice(0, matchIndex), bold: false, italic: false, code: false });
      }
      
      // Add formatted text
      segments.push({
        text: earliest.match[1],
        bold: earliest.type === 'bold',
        italic: earliest.type === 'italic',
        code: earliest.type === 'code',
      });
      
      remaining = remaining.slice(matchIndex + earliest.match[0].length);
    }
    
    // Now render segments with proper formatting
    let currentX = x;
    let currentY = y;
    
    for (const segment of segments) {
      if (segment.code) {
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(120, 80, 150);
      } else if (segment.bold && segment.italic) {
        pdf.setFont('helvetica', 'bolditalic');
        pdf.setTextColor(31, 41, 55);
      } else if (segment.bold) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
      } else if (segment.italic) {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(70, 80, 90);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
      }
      
      const segmentWidth = pdf.getTextWidth(segment.text);
      
      // Check if we need to wrap
      if (currentX + segmentWidth > x + maxW) {
        // Wrap: split text and continue on next line
        const words = segment.text.split(' ');
        for (const word of words) {
          const wordWidth = pdf.getTextWidth(word + ' ');
          if (currentX + wordWidth > x + maxW && currentX > x) {
            currentY += lineHeight;
            currentX = x;
            checkPageBreak();
          }
          pdf.text(word + ' ', currentX, currentY);
          currentX += wordWidth;
        }
      } else {
        pdf.text(segment.text, currentX, currentY);
        currentX += segmentWidth;
      }
    }
    
    // Reset to body style
    setBodyStyle();
    
    return currentY;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    checkPageBreak();
    
    // Headers with different levels
    if (line.startsWith('#### ')) {
      setHeadingStyle(3);
      const text = sanitizePdfText(line.replace('#### ', ''));
      yPos += 3;
      pdf.text(text, startX, yPos);
      yPos += lineHeight + 2;
      setBodyStyle();
      continue;
    }
    if (line.startsWith('### ')) {
      setHeadingStyle(2);
      const text = sanitizePdfText(line.replace('### ', ''));
      yPos += 4;
      // Draw accent bar
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(startX, yPos - 4, 2, 6, 'F');
      pdf.text(text, startX + 5, yPos);
      yPos += lineHeight + 4;
      setBodyStyle();
      continue;
    }
    if (line.startsWith('## ')) {
      setHeadingStyle(1);
      const text = sanitizePdfText(line.replace('## ', ''));
      yPos += 6;
      pdf.text(text, startX, yPos);
      yPos += 2;
      // Underline
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(startX, yPos, startX + maxWidth * 0.4, yPos);
      yPos += lineHeight + 4;
      setBodyStyle();
      continue;
    }
    if (line.startsWith('# ')) {
      setHeadingStyle(0);
      const text = sanitizePdfText(line.replace('# ', ''));
      yPos += 8;
      pdf.text(text, startX, yPos);
      yPos += 2;
      // Bold underline
      pdf.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.setLineWidth(0.6);
      pdf.line(startX, yPos, startX + Math.min(pdf.getTextWidth(text) + 10, maxWidth), yPos);
      yPos += lineHeight + 6;
      setBodyStyle();
      continue;
    }
    
    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      yPos += 4;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(startX, yPos, startX + maxWidth, yPos);
      yPos += 8;
      continue;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      const quoteText = sanitizePdfText(line.replace('> ', ''));
      yPos += 2;
      // Draw quote bar
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.rect(startX, yPos - 4, 2, 10, 'F');
      // Light background
      pdf.setFillColor(248, 250, 252);
      pdf.rect(startX + 4, yPos - 5, maxWidth - 4, 12, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(80, 90, 100);
      const wrappedQuote = pdf.splitTextToSize(quoteText, maxWidth - 12);
      wrappedQuote.forEach((qLine: string) => {
        checkPageBreak();
        pdf.text(qLine, startX + 8, yPos);
        yPos += lineHeight;
      });
      yPos += 4;
      setBodyStyle();
      continue;
    }
    
    // Bullet points with proper styling
    const bulletMatch = line.match(/^[\s]*[-*]\s(.+)/);
    if (bulletMatch) {
      setBodyStyle();
      const bulletText = sanitizePdfText(bulletMatch[1]);
      const indent = 8;
      
      // Draw styled bullet
      pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.circle(startX + indent - 3, yPos - 1.2, 1.2, 'F');
      
      // Render text with inline formatting
      const wrappedText = pdf.splitTextToSize(bulletText.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'), maxWidth - indent - 5);
      
      wrappedText.forEach((textLine: string, idx: number) => {
        checkPageBreak();
        if (idx === 0) {
          yPos = renderFormattedText(bulletText, startX + indent, yPos, maxWidth - indent - 5);
        }
        yPos += lineHeight;
      });
      continue;
    }
    
    // Numbered list with styled numbers
    const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s(.+)/);
    if (numberedMatch) {
      setBodyStyle();
      const numText = sanitizePdfText(numberedMatch[2]);
      const num = numberedMatch[1];
      const indent = 10;
      
      // Draw number in circle
      pdf.setFillColor(240, 245, 250);
      pdf.circle(startX + indent - 4, yPos - 1.2, 3, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      pdf.text(num, startX + indent - 4.5, yPos);
      
      setBodyStyle();
      const wrappedText = pdf.splitTextToSize(numText.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'), maxWidth - indent - 8);
      
      wrappedText.forEach((textLine: string, idx: number) => {
        checkPageBreak();
        if (idx === 0) {
          yPos = renderFormattedText(numText, startX + indent + 2, yPos, maxWidth - indent - 8);
        }
        yPos += lineHeight;
      });
      continue;
    }
    
    // Empty line
    if (line.trim() === '') {
      yPos += paragraphSpacing / 2;
      continue;
    }
    
    // Check for markdown table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: string[] = [line];
      while (i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].trim().startsWith('|')) {
        i++;
        tableRows.push(lines[i]);
      }
      
      yPos = renderMarkdownTable(pdf, tableRows, startX, yPos, maxWidth, primaryRgb, isMonochrome);
      yPos += paragraphSpacing;
      continue;
    }
    
    // Regular paragraph with inline formatting
    setBodyStyle();
    
    // Check if line contains formatting markers
    if (line.includes('**') || line.includes('*') || line.includes('`')) {
      yPos = renderFormattedText(line, startX, yPos, maxWidth);
      yPos += lineHeight;
    } else {
      const processedLine = sanitizePdfText(line);
      const wrappedLines = pdf.splitTextToSize(processedLine, maxWidth);
      wrappedLines.forEach((textLine: string) => {
        checkPageBreak();
        pdf.text(textLine, startX, yPos);
        yPos += lineHeight;
      });
    }
  }
  
  return yPos;
};

/**
 * Renders a markdown table to PDF
 */
const renderMarkdownTable = (
  pdf: jsPDF,
  rows: string[],
  startX: number,
  startY: number,
  maxWidth: number,
  primaryRgb: { r: number; g: number; b: number },
  isMonochrome: boolean
): number => {
  // Parse table rows
  const parsedRows = rows
    .filter(row => !row.match(/^\|[\s-:|]+\|$/)) // Skip separator row
    .map(row => 
      row.split('|')
        .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1) // Remove empty first/last
        .map(cell => sanitizePdfText(cell.trim()))
    );
  
  if (parsedRows.length === 0) return startY;
  
  const colCount = parsedRows[0].length;
  const colWidth = Math.min((maxWidth - 10) / colCount, 50);
  const rowHeight = 10;
  const padding = 3;
  
  let yPos = startY;
  
  parsedRows.forEach((row, rowIdx) => {
    const isHeader = rowIdx === 0;
    
    // Draw row background
    if (isHeader) {
      if (isMonochrome) {
        pdf.setFillColor(220, 220, 220);
      } else {
        pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      }
      pdf.rect(startX, yPos - rowHeight + 3, colWidth * colCount, rowHeight, 'F');
    } else if (rowIdx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(startX, yPos - rowHeight + 3, colWidth * colCount, rowHeight, 'F');
    }
    
    // Draw cells
    row.forEach((cell, colIdx) => {
      const cellX = startX + (colIdx * colWidth) + padding;
      
      pdf.setFontSize(9);
      if (isHeader) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(isMonochrome ? 31 : 255, isMonochrome ? 41 : 255, isMonochrome ? 55 : 255);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
      }
      
      // Truncate if too long
      let displayText = cell;
      const maxChars = Math.floor((colWidth - padding * 2) / 2);
      if (displayText.length > maxChars) {
        displayText = displayText.slice(0, maxChars - 2) + '..';
      }
      
      pdf.text(displayText, cellX, yPos);
    });
    
    // Draw row border
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(startX, yPos + 3, startX + colWidth * colCount, yPos + 3);
    
    yPos += rowHeight;
  });
  
  return yPos;
};

/**
 * Format currency for PDF display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
};
