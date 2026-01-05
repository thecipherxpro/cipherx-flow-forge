import React from 'react';

interface HtmlContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders HTML content from TipTap rich text editor with proper styling.
 * Handles both HTML content and markdown fallback.
 */
const HtmlContentRenderer: React.FC<HtmlContentRendererProps> = ({ content, className = '' }) => {
  if (!content) {
    return null;
  }

  // Check if content is HTML (starts with < or contains HTML tags)
  const isHtml = content.trim().startsWith('<') || /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div 
        className={`html-content-renderer max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Fallback to markdown-like parsing for legacy content
  return <MarkdownFallbackRenderer content={content} className={className} />;
};

// Fallback renderer for markdown content
const MarkdownFallbackRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const parseContent = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
    let tableRows: string[][] = [];
    let inTable = false;

    const processInlineStyles = (line: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/(\*\*|__)([^*_]+)\1/);
        const italicMatch = remaining.match(/(\*|_)([^*_]+)\1/);
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
        
        if (index > 0) {
          parts.push(remaining.slice(0, index));
        }

        if (earliest.type === 'bold') {
          parts.push(<strong key={key++} className="font-bold">{earliest.match[2]}</strong>);
        } else if (earliest.type === 'italic') {
          parts.push(<em key={key++} className="italic">{earliest.match[2]}</em>);
        } else if (earliest.type === 'code') {
          parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">{earliest.match[1]}</code>);
        }

        remaining = remaining.slice(index + earliest.match[0].length);
      }

      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    const flushList = () => {
      if (listItems) {
        if (listItems.type === 'ul') {
          elements.push(<ul key={elements.length} className="my-4 ml-6 space-y-2 list-disc">{listItems.items}</ul>);
        } else {
          elements.push(<ol key={elements.length} className="my-4 ml-6 space-y-2 list-decimal">{listItems.items}</ol>);
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
                    <th key={i} className="px-4 py-3 text-left font-semibold text-sm border-b border-border">
                      {processInlineStyles(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-sm border-b border-border">
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

      if (!trimmedLine) {
        flushList();
        flushTable();
        return;
      }

      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = trimmedLine.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      const h1Match = trimmedLine.match(/^#\s+(.+)$/);
      const h2Match = trimmedLine.match(/^##\s+(.+)$/);
      const h3Match = trimmedLine.match(/^###\s+(.+)$/);

      if (h3Match) {
        flushList();
        elements.push(<h3 key={elements.length} className="text-lg font-semibold mt-6 mb-3">{processInlineStyles(h3Match[1])}</h3>);
        return;
      }
      if (h2Match) {
        flushList();
        elements.push(<h2 key={elements.length} className="text-xl font-bold mt-8 mb-4 pb-2 border-b border-border">{processInlineStyles(h2Match[1])}</h2>);
        return;
      }
      if (h1Match) {
        flushList();
        elements.push(<h1 key={elements.length} className="text-2xl font-bold mt-8 mb-4">{processInlineStyles(h1Match[1])}</h1>);
        return;
      }

      const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        if (listItems?.type !== 'ul') {
          flushList();
          listItems = { type: 'ul', items: [] };
        }
        listItems.items.push(<li key={listItems.items.length}>{processInlineStyles(bulletMatch[1])}</li>);
        return;
      }

      const numberedMatch = trimmedLine.match(/^(\d+)[.)]\s+(.+)$/);
      if (numberedMatch) {
        if (listItems?.type !== 'ol') {
          flushList();
          listItems = { type: 'ol', items: [] };
        }
        listItems.items.push(<li key={listItems.items.length}>{processInlineStyles(numberedMatch[2])}</li>);
        return;
      }

      const quoteMatch = trimmedLine.match(/^>\s*(.+)$/);
      if (quoteMatch) {
        flushList();
        elements.push(<blockquote key={elements.length} className="my-4 pl-4 border-l-4 border-primary bg-primary/5 py-3 pr-4 rounded-r-lg italic">{processInlineStyles(quoteMatch[1])}</blockquote>);
        return;
      }

      flushList();
      elements.push(<p key={elements.length} className="leading-relaxed my-2">{processInlineStyles(trimmedLine)}</p>);
    });

    flushList();
    flushTable();

    return elements;
  };

  return <div className={className}>{parseContent(content)}</div>;
};

export default HtmlContentRenderer;
