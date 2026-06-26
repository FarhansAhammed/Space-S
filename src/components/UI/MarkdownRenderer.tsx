"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Copy, 
  Check, 
  Info, 
  AlertTriangle, 
  Lightbulb, 
  AlertOctagon, 
  Terminal, 
  CheckSquare, 
  Square, 
  Hash, 
  ExternalLink 
} from 'lucide-react';
import Prism from 'prismjs';

// Import Prism CSS and components for syntax highlighting support
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-docker';

// Interface for MermaidBlock component props
interface MermaidBlockProps {
  chart: string;
  isLoading: boolean;
}

const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart, isLoading }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const elementId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let active = true;
    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
        });

        // Test if diagram code parses successfully
        try {
          await mermaid.parse(chart);
        } catch (parseErr) {
          if (active) setError(true);
          return;
        }

        const { svg: renderedSvg } = await mermaid.render(elementId.current, chart);
        if (active) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch (err) {
        if (active) setError(true);
      }
    };

    renderChart();
    return () => {
      active = false;
    };
  }, [chart]);

  if (error) {
    if (isLoading) {
      // While streaming, render a clean spinner/skeleton instead of a syntax error
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 select-none my-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Drawing diagram...</span>
        </div>
      );
    } else {
      // Completed with syntax error, show a neat error box with raw Mermaid text
      return (
        <div className="my-3 flex flex-col gap-2 p-3 border border-red-200 dark:border-red-950/30 rounded-xl bg-red-50/50 dark:bg-red-950/10">
          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Unable to parse diagram:</span>
          <pre className="text-[9px] font-mono text-zinc-500 overflow-x-auto whitespace-pre p-2 bg-black/5 dark:bg-white/5 rounded-lg">{chart}</pre>
        </div>
      );
    }
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 select-none my-3">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-[#7c4dff] mb-2" />
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Loading diagram...</span>
      </div>
    );
  }

  return (
    <div 
      className="my-3 p-3 border border-zinc-200 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-950 overflow-x-auto flex justify-center shadow-sm select-none max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

// Interface for CodeBlock props
interface CodeBlockProps {
  lang: string;
  rawCode: string;
  isLoading: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ lang, rawCode, isLoading }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  // Intercept Mermaid blocks
  if (lang === 'mermaid') {
    return <MermaidBlock chart={rawCode} isLoading={isLoading} />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const highlightedHtml = useMemo(() => {
    if (!lang) return '';
    try {
      const grammar = Prism.languages[lang] || Prism.languages.markup;
      return Prism.highlight(rawCode, grammar, lang);
    } catch (err) {
      return '';
    }
  }, [rawCode, lang]);

  const lines = rawCode.split('\n');

  return (
    <div className="my-3 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm flex flex-col font-mono text-[10px] w-full max-w-full">
      {/* Codeblock Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
        <div className="flex items-center gap-1.5 font-sans font-semibold text-[9px] uppercase tracking-wider">
          <Terminal className="w-3 h-3 text-[#7c4dff]" />
          <span>{lang || 'code'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Line Numbers Toggle */}
          <button
            type="button"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Toggle Line Numbers"
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-250 transition-colors ${showLineNumbers ? 'text-[#7c4dff] bg-zinc-200 dark:bg-zinc-800' : ''}`}
          >
            <Hash className="w-3 h-3" />
          </button>
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-[8px] font-sans">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[8px] font-sans">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Codeblock Body */}
      <div className="bg-[#2d2d2d] text-[#ccc] p-3 overflow-x-auto flex flex-row select-text leading-relaxed no-canvas-wheel">
        {showLineNumbers && (
          <div className="select-none text-zinc-500 text-right pr-3 border-r border-zinc-700/80 mr-3 flex flex-col font-mono text-[10px] leading-relaxed">
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}
        <pre className="flex-1 font-mono text-[10px] leading-relaxed overflow-x-auto m-0 p-0 bg-transparent border-0">
          {highlightedHtml ? (
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} className={`language-${lang}`} />
          ) : (
            <code className={`language-${lang}`}>{rawCode}</code>
          )}
        </pre>
      </div>
    </div>
  );
};

// Interface for Admonition / Blockquote component props
interface AdmonitionProps {
  children: React.ReactNode;
}

const stripPrefix = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (!child) return child;
    if (typeof child === 'string') {
      return child.replace(/^(\*\*Note:\*\*|\*\*Warning:\*\*|\*\*Tip:\*\*|\*\*Danger:\*\*|\[!NOTE\]|\[!WARNING\]|\[!CAUTION\]|\[!TIP\]|\[!IMPORTANT\]|\[!DANGER\])\s*/i, '');
    }
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<any>;
      if (element.props && element.props.children) {
        return React.cloneElement(element, {
          ...element.props,
          children: stripPrefix(element.props.children)
        });
      }
    }
    return child;
  });
};

const Blockquote: React.FC<AdmonitionProps> = ({ children }) => {
  const getFlatText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getFlatText).join('');
    if (node.props && node.props.children) return getFlatText(node.props.children);
    return '';
  };

  const text = getFlatText(children).trim();

  const isNote = text.match(/^(\*\*Note:\*\*|\[!NOTE\])/i);
  const isWarning = text.match(/^(\*\*Warning:\*\*|\[!WARNING\]|\[!CAUTION\])/i);
  const isTip = text.match(/^(\*\*Tip:\*\*|\[!TIP\]|\[!IMPORTANT\])/i);
  const isDanger = text.match(/^(\*\*Danger:\*\*|\[!DANGER\])/i);

  if (isNote || isWarning || isTip || isDanger) {
    let icon = <Info className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" />;
    let title = 'Note';
    let bg = 'bg-blue-50/50 dark:bg-blue-950/10';
    let border = 'border-blue-500 dark:border-blue-400';
    let textClass = 'text-blue-800 dark:text-blue-300';

    if (isWarning) {
      icon = <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />;
      title = 'Warning';
      bg = 'bg-amber-50/50 dark:bg-amber-950/10';
      border = 'border-amber-500 dark:border-amber-400';
      textClass = 'text-amber-800 dark:text-amber-300';
    } else if (isTip) {
      icon = <Lightbulb className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />;
      title = 'Tip';
      bg = 'bg-emerald-50/50 dark:bg-emerald-950/10';
      border = 'border-emerald-500 dark:border-emerald-400';
      textClass = 'text-emerald-800 dark:text-emerald-300';
    } else if (isDanger) {
      icon = <AlertOctagon className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400 mt-0.5" />;
      title = 'Danger';
      bg = 'bg-red-50/50 dark:bg-red-950/10';
      border = 'border-red-500 dark:border-red-400';
      textClass = 'text-red-800 dark:text-red-300';
    }

    return (
      <div className={`my-3 p-3 border-l-4 rounded-r-xl ${bg} ${border} ${textClass} flex gap-2.5 items-start`}>
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 select-none">{title}</div>
          <div className="text-[11px] leading-relaxed">{stripPrefix(children)}</div>
        </div>
      </div>
    );
  }

  return (
    <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-0.5 my-3 text-zinc-500 dark:text-zinc-400 italic text-[11px]">
      {children}
    </blockquote>
  );
};

// MarkdownRenderer Props
interface MarkdownRendererProps {
  content: string;
  textScale?: number;
  isLoading?: boolean;
  highlightSnippet?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  textScale = 1, 
  isLoading = false,
  highlightSnippet
}) => {
  const baseFontSize = (px: number) => `${Math.round(px * textScale)}px`;

  const highlightText = (text: string, snippet: string) => {
    if (!snippet || !text || typeof text !== 'string') return text;
    const index = text.toLowerCase().indexOf(snippet.toLowerCase());
    if (index === -1) return text;

    const parts: React.ReactNode[] = [];
    let currentText = text;
    while (currentText) {
      const idx = currentText.toLowerCase().indexOf(snippet.toLowerCase());
      if (idx === -1) {
        parts.push(currentText);
        break;
      }
      if (idx > 0) {
        parts.push(currentText.substring(0, idx));
      }
      const match = currentText.substring(idx, idx + snippet.length);
      parts.push(
        <span 
          key={parts.length} 
          className="bg-[#7c4dff]/25 text-[#7c4dff] dark:text-[#be9eff] font-bold px-1 rounded transition-all duration-300 relative border border-[#7c4dff]/30 shadow-sm animate-pulse"
        >
          {match}
        </span>
      );
      currentText = currentText.substring(idx + snippet.length);
    }
    return parts;
  };

  const highlightInChildren = (children: React.ReactNode, snippet: string | undefined): React.ReactNode => {
    if (!snippet) return children;
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        return highlightText(child, snippet);
      }
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<any>;
        if (element.props && element.props.children) {
          return React.cloneElement(element, {
            ...element.props,
            children: highlightInChildren(element.props.children, snippet)
          });
        }
      }
      return child;
    });
  };

  // Custom components mappings passed to ReactMarkdown
  const markdownComponents = useMemo(() => {
    return {
      // Headings inside nodes (scaled down to fit contexts)
      h1: ({ children }: any) => (
        <h1 style={{ fontSize: baseFontSize(13) }} className="font-extrabold text-zinc-950 dark:text-white mt-3.5 mb-1.5 font-display tracking-tight leading-snug">
          {highlightInChildren(children, highlightSnippet)}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 style={{ fontSize: baseFontSize(12) }} className="font-bold text-zinc-950 dark:text-white mt-3 mb-1 font-display tracking-tight leading-snug">
          {highlightInChildren(children, highlightSnippet)}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 style={{ fontSize: baseFontSize(11) }} className="font-semibold text-zinc-950 dark:text-white mt-2.5 mb-1 font-display leading-snug">
          {highlightInChildren(children, highlightSnippet)}
        </h3>
      ),

      // Paragraph & Text layouts
      p: ({ children }: any) => (
        <p style={{ fontSize: baseFontSize(11) }} className="leading-relaxed min-h-[4px] text-zinc-700 dark:text-zinc-300 mb-1.5 break-words whitespace-pre-wrap">
          {highlightInChildren(children, highlightSnippet)}
        </p>
      ),
      strong: ({ children }: any) => (
        <strong className="font-bold text-zinc-900 dark:text-white">
          {highlightInChildren(children, highlightSnippet)}
        </strong>
      ),
      em: ({ children }: any) => (
        <em className="italic">
          {highlightInChildren(children, highlightSnippet)}
        </em>
      ),
      del: ({ children }: any) => (
        <del className="line-through opacity-60">
          {highlightInChildren(children, highlightSnippet)}
        </del>
      ),

      // Links: Markdown and Auto-detected
      a: ({ href, children }: any) => (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ fontSize: baseFontSize(11) }}
          className="inline-flex items-center gap-0.5 text-[#7c4dff] dark:text-[#9c75ff] hover:underline font-semibold break-all"
        >
          <span>{highlightInChildren(children, highlightSnippet)}</span>
          <ExternalLink className="w-2.5 h-2.5 inline-block opacity-75 shrink-0" />
        </a>
      ),

      // Divider rules
      hr: () => (
        <hr className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
      ),

      // Code blocks (Custom renderer)
      pre: ({ children, ...props }: any) => {
        const childrenArray = React.Children.toArray(children);
        const codeChild = childrenArray.find(
          (child) => React.isValidElement(child) && (child.type === 'code' || (child.type as any)?.displayName === 'code')
        );

        if (codeChild && React.isValidElement(codeChild)) {
          const codeProps = codeChild.props as any;
          const className = codeProps.className || '';
          const rawCode = String(codeProps.children || '').replace(/\n$/, '');
          const match = /language-(\w+)/.exec(className);
          const lang = match ? match[1] : '';

          return (
            <CodeBlock 
              lang={lang} 
              rawCode={rawCode} 
              isLoading={isLoading} 
            />
          );
        }
        return <pre className="bg-transparent border-0 m-0 p-0" {...props}>{children}</pre>;
      },

      code: ({ className, children, ...props }: any) => {
        return (
          <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#7c4dff] dark:text-[#be9eff] font-mono text-[9.5px] break-all whitespace-pre-wrap" {...props}>
            {highlightInChildren(children, highlightSnippet)}
          </code>
        );
      },

      // Blockquotes (Admonitions or regular)
      blockquote: ({ children }: any) => (
        <Blockquote>{children}</Blockquote>
      ),

      // Custom Table renderer with scroll wrapper
      table: ({ children }: any) => (
        <div className="w-full max-w-full overflow-x-auto my-3 border border-zinc-200 dark:border-zinc-800/80 rounded-xl no-canvas-wheel shadow-sm">
          <table className="min-w-full border-collapse text-[10.5px] text-zinc-700 dark:text-zinc-300">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="bg-zinc-100 dark:bg-zinc-900/60 font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800">
          {children}
        </thead>
      ),
      tr: ({ children }: any) => (
        <tr className="border-b border-zinc-200 dark:border-zinc-800/50 last:border-0 odd:bg-white even:bg-zinc-50/50 dark:odd:bg-transparent dark:even:bg-zinc-900/10">
          {children}
        </tr>
      ),
      th: ({ children }: any) => (
        <th style={{ fontSize: baseFontSize(10.5) }} className="px-3 py-2 text-left font-semibold border-r border-zinc-200 dark:border-zinc-800/50 last:border-r-0">
          {highlightInChildren(children, highlightSnippet)}
        </th>
      ),
      td: ({ children }: any) => (
        <td style={{ fontSize: baseFontSize(10.5) }} className="px-3 py-2 text-left border-r border-zinc-200 dark:border-zinc-800/50 last:border-r-0 max-w-[200px] break-words whitespace-normal">
          {highlightInChildren(children, highlightSnippet)}
        </td>
      ),

      // Lists & Custom Checkbox Task Lists
      ul: ({ children }: any) => (
        <ul style={{ fontSize: baseFontSize(11) }} className="list-disc pl-5 my-1.5 space-y-1 text-zinc-700 dark:text-zinc-300">
          {children}
        </ul>
      ),
      ol: ({ children, start }: any) => (
        <ol 
          start={start}
          style={{ fontSize: baseFontSize(11) }} 
          className="list-decimal pl-5 my-1.5 space-y-1 text-zinc-700 dark:text-zinc-300"
        >
          {children}
        </ol>
      ),
      li: ({ children, className, ...props }: any) => {
        const isTask = className?.includes('task-list-item');
        return (
          <li 
            style={{ fontSize: baseFontSize(11) }}
            className={`${isTask ? 'list-none -ml-5 flex items-start gap-2 my-1' : ''} text-zinc-700 dark:text-zinc-300 break-words`} 
            {...props}
          >
            {highlightInChildren(children, highlightSnippet)}
          </li>
        );
      },
      input: ({ type, checked, ...props }: any) => {
        if (type === 'checkbox') {
          return (
            <span className="inline-flex items-center justify-center shrink-0 mt-0.5 select-none">
              {checked ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#7c4dff]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-650" />
              )}
            </span>
          );
        }
        return <input type={type} {...props} />;
      }
    };
  }, [textScale, isLoading, highlightSnippet]);

  return (
    <div className="markdown-content w-full h-full text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans select-text break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]} 
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
