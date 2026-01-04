import React from 'react';

interface RichTextRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders rich text content with support for:
 * - Bold (**text** or __text__)
 * - Italic (*text* or _text_)
 * - Headings (# H1, ## H2, ### H3)
 * - Bullet lists (- or *)
 * - Numbered lists (1. 2. 3.)
 * - Tables (| col1 | col2 |)
 * - Line breaks and paragraphs
 */
const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
  if (!content) {
    return null;
  }

  const parseContent = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
    let tableRows: string[][] = [];
    let inTable = false;

    const processInlineStyles = (line: string): React.ReactNode => {
      // Process bold, italic, and inline code
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        // Bold: **text** or __text__
        const boldMatch = remaining.match(/(\*\*|__)([^*_]+)\1/);
        // Italic: *text* or _text_
        const italicMatch = remaining.match(/(\*|_)([^*_]+)\1/);
        // Inline code: `text`
        const codeMatch = remaining.match(/`([^`]+)`/);

        const matches = [
          { match: boldMatch, type: 'bold' },
          { match: italicMatch, type: 'italic' },
          { match: codeMatch, type: 'code' },
        ].filter(m => m.match);

        if (matches.length === 0) {
          parts.push(remaining);
          break;
        }

        // Find the earliest match
        const earliest = matches.reduce((prev, curr) => {
          if (!prev.match) return curr;
          if (!curr.match) return prev;
          return (prev.match.index ?? Infinity) < (curr.match.index ?? Infinity) ? prev : curr;
        });

        if (!earliest.match) {
          parts.push(remaining);
          break;
        }

        const index = earliest.match.index ?? 0;
        
        // Add text before the match
        if (index > 0) {
          parts.push(remaining.slice(0, index));
        }

        // Add the styled element
        if (earliest.type === 'bold') {
          parts.push(
            <strong key={key++} className="font-bold text-foreground">
              {earliest.match[2]}
            </strong>
          );
        } else if (earliest.type === 'italic') {
          parts.push(
            <em key={key++} className="italic text-foreground/90">
              {earliest.match[2]}
            </em>
          );
        } else if (earliest.type === 'code') {
          parts.push(
            <code key={key++} className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm text-primary">
              {earliest.match[1]}
            </code>
          );
        }

        remaining = remaining.slice(index + earliest.match[0].length);
      }

      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    const flushList = () => {
      if (listItems) {
        if (listItems.type === 'ul') {
          elements.push(
            <ul key={elements.length} className="my-4 ml-6 space-y-2">
              {listItems.items}
            </ul>
          );
        } else {
          elements.push(
            <ol key={elements.length} className="my-4 ml-6 space-y-2 list-decimal">
              {listItems.items}
            </ol>
          );
        }
        listItems = null;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1).filter(row => !row.every(cell => cell.match(/^-+$/)));
        
        elements.push(
          <div key={elements.length} className="my-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {headerRow.map((cell, i) => (
                    <th key={i} className="px-4 py-3 text-left font-semibold text-sm text-foreground border-b border-border">
                      {processInlineStyles(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-sm text-muted-foreground border-b border-border last:border-b-0">
                        {processInlineStyles(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Skip empty lines but flush lists/tables
      if (!trimmedLine) {
        flushList();
        flushTable();
        if (elements.length > 0 && lineIndex > 0) {
          elements.push(<div key={`spacer-${lineIndex}`} className="h-3" />);
        }
        return;
      }

      // Table detection
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      const h1Match = trimmedLine.match(/^#\s+(.+)$/);
      const h2Match = trimmedLine.match(/^##\s+(.+)$/);
      const h3Match = trimmedLine.match(/^###\s+(.+)$/);
      const h4Match = trimmedLine.match(/^####\s+(.+)$/);

      if (h4Match) {
        flushList();
        elements.push(
          <h4 key={elements.length} className="text-base font-semibold text-foreground mt-5 mb-2">
            {processInlineStyles(h4Match[1])}
          </h4>
        );
        return;
      }
      if (h3Match) {
        flushList();
        elements.push(
          <h3 key={elements.length} className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            {processInlineStyles(h3Match[1])}
          </h3>
        );
        return;
      }
      if (h2Match) {
        flushList();
        elements.push(
          <h2 key={elements.length} className="text-xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border">
            {processInlineStyles(h2Match[1])}
          </h2>
        );
        return;
      }
      if (h1Match) {
        flushList();
        elements.push(
          <h1 key={elements.length} className="text-2xl font-bold text-foreground mt-8 mb-4 pb-3 border-b-2 border-primary">
            {processInlineStyles(h1Match[1])}
          </h1>
        );
        return;
      }

      // Bullet lists
      const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        if (listItems?.type !== 'ul') {
          flushList();
          listItems = { type: 'ul', items: [] };
        }
        listItems.items.push(
          <li key={listItems.items.length} className="flex items-start gap-3 text-muted-foreground">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="leading-relaxed">{processInlineStyles(bulletMatch[1])}</span>
          </li>
        );
        return;
      }

      // Numbered lists
      const numberedMatch = trimmedLine.match(/^(\d+)[.)]\s+(.+)$/);
      if (numberedMatch) {
        if (listItems?.type !== 'ol') {
          flushList();
          listItems = { type: 'ol', items: [] };
        }
        listItems.items.push(
          <li key={listItems.items.length} className="flex items-start gap-3 text-muted-foreground">
            <span className="mt-0.5 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
              {numberedMatch[1]}
            </span>
            <span className="leading-relaxed">{processInlineStyles(numberedMatch[2])}</span>
          </li>
        );
        return;
      }

      // Horizontal rule
      if (trimmedLine.match(/^[-*_]{3,}$/)) {
        flushList();
        elements.push(
          <hr key={elements.length} className="my-6 border-t-2 border-border" />
        );
        return;
      }

      // Blockquote
      const quoteMatch = trimmedLine.match(/^>\s*(.+)$/);
      if (quoteMatch) {
        flushList();
        elements.push(
          <blockquote key={elements.length} className="my-4 pl-4 border-l-4 border-primary bg-primary/5 py-3 pr-4 rounded-r-lg text-muted-foreground italic">
            {processInlineStyles(quoteMatch[1])}
          </blockquote>
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={elements.length} className="text-muted-foreground leading-relaxed my-2">
          {processInlineStyles(trimmedLine)}
        </p>
      );
    });

    // Flush any remaining list or table
    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className={`rich-text-content ${className}`}>
      {parseContent(content)}
    </div>
  );
};

export default RichTextRenderer;
