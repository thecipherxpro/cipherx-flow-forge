/**
 * Converts markdown-like text content to HTML for use in TipTap editor
 * Supports: bold, italic, headers, lists, tables, line breaks, paragraphs
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Check if content is already HTML (has HTML tags)
  if (/<[a-z][\s\S]*>/i.test(markdown) && !markdown.includes('**')) {
    return markdown;
  }
  
  let html = markdown;
  
  // Escape HTML entities first (but preserve existing HTML if any)
  html = html
    .replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, '&amp;');
  
  // Convert markdown tables to HTML tables
  html = convertTables(html);
  
  // Split into lines for processing
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines but preserve paragraph breaks
    if (line.trim() === '') {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      processedLines.push('');
      continue;
    }
    
    // Headers (## Header, ### Header, etc.)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      const level = headerMatch[1].length;
      const text = processInlineFormatting(headerMatch[2]);
      processedLines.push(`<h${level}>${text}</h${level}>`);
      continue;
    }
    
    // Numbered list items (1. item, 2. item, etc.)
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${processInlineFormatting(numberedMatch[1])}</li>`);
      continue;
    }
    
    // Bullet list items (• item, - item, * item)
    const bulletMatch = line.match(/^[•\-*]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${processInlineFormatting(bulletMatch[1])}</li>`);
      continue;
    }
    
    // Close list if we hit a non-list item
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
    
    // Regular paragraph - process inline formatting
    const processedLine = processInlineFormatting(line);
    processedLines.push(`<p>${processedLine}</p>`);
  }
  
  // Close any open list
  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  // Join lines and clean up
  html = processedLines.join('\n');
  
  // Remove empty paragraphs but keep some spacing
  html = html.replace(/<p><\/p>/g, '<p><br></p>');
  
  // Clean up multiple consecutive empty lines
  html = html.replace(/(<p><br><\/p>\s*){3,}/g, '<p><br></p><p><br></p>');
  
  return html;
}

/**
 * Process inline markdown formatting (bold, italic, code, links)
 */
function processInlineFormatting(text: string): string {
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not inside words)
  text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
  
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return text;
}

/**
 * Convert markdown tables to HTML tables
 */
function convertTables(content: string): string {
  const lines = content.split('\n');
  let result: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this is a table row (starts and ends with |)
    if (line.startsWith('|') && line.endsWith('|')) {
      // Check if it's a separator row (contains only |, -, and spaces)
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        // This is the separator, we're in a table
        inTable = true;
        tableLines.push(line);
        continue;
      }
      
      tableLines.push(line);
      inTable = true;
    } else {
      // Not a table line
      if (inTable && tableLines.length > 0) {
        // Process the accumulated table
        result.push(processTable(tableLines));
        tableLines = [];
        inTable = false;
      }
      result.push(lines[i]);
    }
  }
  
  // Handle table at end of content
  if (tableLines.length > 0) {
    result.push(processTable(tableLines));
  }
  
  return result.join('\n');
}

/**
 * Convert a set of table lines to an HTML table
 */
function processTable(lines: string[]): string {
  if (lines.length < 2) return lines.join('\n');
  
  let html = '<table>';
  let isHeader = true;
  
  for (const line of lines) {
    // Skip separator rows
    if (/^\|[\s\-:|]+\|$/.test(line)) {
      isHeader = false;
      continue;
    }
    
    // Parse cells
    const cells = line
      .split('|')
      .slice(1, -1) // Remove first and last empty strings
      .map(cell => processInlineFormatting(cell.trim()));
    
    if (isHeader) {
      html += '<thead><tr>';
      cells.forEach(cell => html += `<th>${cell}</th>`);
      html += '</tr></thead><tbody>';
    } else {
      html += '<tr>';
      cells.forEach(cell => html += `<td>${cell}</td>`);
      html += '</tr>';
    }
  }
  
  html += '</tbody></table>';
  return html;
}
