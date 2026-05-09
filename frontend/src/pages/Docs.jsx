import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import { COLORS } from '../utils/constants';

const C = {
  bg: '#090910',
  card: '#11112a',
  surface: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',
  cyan: '#00ccff',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: '◈' },
  { id: 'regime-detection', label: 'Regime Detection', icon: '◎' },
  { id: 'microstructure', label: 'Microstructure', icon: '◆' },
  { id: 'alt-data', label: 'Alt Data', icon: '◇' },
  { id: 'causal-ai', label: 'Causal AI', icon: '▦' },
  { id: 'alerts', label: 'Alerts', icon: '◉' },
  { id: 'symbols', label: 'Symbol Management', icon: '◈' },
  { id: 'performance', label: 'Performance Log', icon: '◎' },
  { id: 'faq', label: 'FAQ', icon: '◆' },
];

const Docs = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [content, setContent] = useState({});
  const [loadedSections, setLoadedSections] = useState(new Set(['getting-started']));
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allDocContent, setAllDocContent] = useState({});
  const [searchLoaded, setSearchLoaded] = useState(false);
  const contentRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash && SECTIONS.find(s => s.id === hash)) setActiveSection(hash);
  }, [location]);

  useEffect(() => {
    const loadSection = async () => {
      if (loadedSections.has(activeSection)) return;
      try {
        const res = await fetch(`/docs/${activeSection}.md`);
        const text = await res.text();
        setContent(prev => ({ ...prev, [activeSection]: text }));
        setLoadedSections(prev => new Set([...prev, activeSection]));
      } catch (e) {
        console.error('Failed to load docs:', e);
      }
    };
    loadSection();
  }, [activeSection, loadedSections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (SECTIONS.find(s => s.id === id)) {
              setActiveSection(id);
              window.history.replaceState(null, '', `#${id}`);
            }
          }
        });
      },
      { rootMargin: '-20% 0% -60% 0%' }
    );
    document.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [content]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handleOpenSearch(); }
      if (e.key === 'Escape' && showSearch) setShowSearch(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handleOpenSearch = useCallback(async () => {
    setShowSearch(true);
    if (!searchLoaded) {
      const promises = SECTIONS.map(async (s) => {
        try {
          const res = await fetch(`/docs/${s.id}.md`);
          return { id: s.id, content: await res.text() };
        } catch { return { id: s.id, content: '' }; }
      });
      const results = await Promise.all(promises);
      const contentMap = {};
      results.forEach(r => { contentMap[r.id] = r.content; });
      setAllDocContent(contentMap);
      setSearchLoaded(true);
    }
  }, [searchLoaded]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const query = searchQuery.toLowerCase();
    const results = [];
    SECTIONS.forEach(s => {
      const docContent = allDocContent[s.id] || '';
      if (docContent.toLowerCase().includes(query)) {
        const lines = docContent.split('\n');
        let snippet = '';
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query)) {
            snippet = lines[Math.max(0, i - 1)] + ' ' + lines[i] + ' ' + lines[Math.min(lines.length - 1, i + 1)];
            break;
          }
        }
        results.push({ section: s, snippet: snippet.slice(0, 200) });
      }
    });
    setSearchResults(results);
  }, [searchQuery, allDocContent]);

  const handleSearchResultClick = (sectionId) => {
    setActiveSection(sectionId);
    setShowSearch(false);
    setSearchQuery('');
    window.history.replaceState(null, '', `#${sectionId}`);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMarkdown = (md) => {
    let html = marked.parse(md);
    html = html.replace(
      /<pre><code class="language-(\w+)">/g,
      '<pre class="code-block"><button class="copy-btn" data-code="$1">Copy</button><code class="language-$1">'
    );
    return { __html: DOMPurify.sanitize(html) };
  };

  useEffect(() => {
    Prism.highlightAll();
    document.querySelectorAll('.code-block').forEach((pre) => {
      const btn = pre.querySelector('.copy-btn');
      if (btn && !btn.dataset.attached) {
        btn.dataset.attached = 'true';
        btn.addEventListener('click', () => {
          const code = pre.querySelector('code');
          navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'Copied!';
            btn.style.color = C.accent;
            setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = ''; }, 2000);
          });
        });
      }
    });
  }, [content, activeSection]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    window.history.replaceState(null, '', `#${sectionId}`);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

        /* Sidebar nav btn hover */
        .docs-nav-btn { transition: color 120ms, background 120ms, border-left-color 120ms; }
        .docs-nav-btn:hover { background: ${C.surface} !important; color: ${C.text} !important; }

        /* Doc content typography */
        .doc-content { color: ${C.text}; line-height: 1.75; }
        .doc-content h1 { font-family: ${C.mono}; font-size: 22px; color: ${C.text}; font-weight: 600; margin: 0 0 16px; letter-spacing: 0.04em; }
        .doc-content h2 { font-family: ${C.mono}; font-size: 16px; color: ${C.text}; font-weight: 500; margin: 36px 0 12px; letter-spacing: 0.04em; padding-bottom: 8px; border-bottom: 1px solid ${C.border}; }
        .doc-content h3 { font-family: ${C.mono}; font-size: 13px; color: ${C.muted}; font-weight: 500; margin: 24px 0 10px; letter-spacing: 0.06em; text-transform: uppercase; }
        .doc-content p { font-size: 14px; color: #aaaac0; margin: 0 0 14px; }
        .doc-content ul, .doc-content ol { padding-left: 20px; margin: 0 0 14px; }
        .doc-content li { font-size: 14px; color: #aaaac0; margin-bottom: 6px; }
        .doc-content a { color: ${C.cyan}; text-decoration: none; transition: opacity 120ms; }
        .doc-content a:hover { opacity: 0.8; text-decoration: underline; }
        .doc-content code {
          font-family: ${C.mono};
          font-size: 12px;
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 4px;
          padding: 2px 6px;
          color: ${C.accent};
        }
        .doc-content pre {
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 8px;
          overflow-x: auto;
          position: relative;
          margin: 16px 0;
        }
        .doc-content pre code {
          background: none;
          border: none;
          padding: 0;
          color: ${C.text};
          font-size: 13px;
        }
        .doc-content .code-block { padding: 40px 20px 20px; }
        .doc-content .copy-btn {
          position: absolute;
          top: 10px;
          right: 12px;
          padding: 4px 10px;
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 4px;
          color: ${C.faint};
          font-size: 10px;
          font-family: ${C.mono};
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: all 150ms;
        }
        .doc-content .copy-btn:hover { border-color: ${C.accent}; color: ${C.accent}; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .doc-content th {
          padding: 10px 14px;
          background: ${C.surface};
          border: 1px solid ${C.border};
          color: ${C.muted};
          font-family: ${C.mono};
          font-size: 10px;
          font-weight: 400;
          text-align: left;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .doc-content td {
          padding: 10px 14px;
          border: 1px solid ${C.border};
          color: #aaaac0;
          font-size: 13px;
        }
        .doc-content tr:hover td { background: ${C.surface}; }
        .doc-content blockquote {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 3px solid ${C.accent};
          background: ${C.surface};
          border-radius: 0 6px 6px 0;
        }
        .doc-content blockquote p { color: ${C.muted}; margin: 0; }

        /* Search result hover */
        .search-result-btn:hover { background: ${C.surface} !important; }

        /* Scrollbar */
        .docs-scroll::-webkit-scrollbar { width: 4px; }
        .docs-scroll::-webkit-scrollbar-track { background: transparent; }
        .docs-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .docs-modal-enter { animation: fadeIn 150ms ease; }

        @media (max-width: 768px) {
          .docs-sidebar { display: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="docs-sidebar docs-scroll" style={{
        width: '240px',
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '26px', height: '26px',
            border: `1.5px solid ${C.accent}`,
            borderRadius: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 8px ${C.accent}30`,
            flexShrink: 0,
          }}>
            <div style={{ width: '9px', height: '9px', background: C.accent, borderRadius: '2px' }} />
          </div>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, fontWeight: 600, letterSpacing: '0.06em' }}>
              VektorLabs
            </div>
            <div style={{ fontFamily: C.mono, fontSize: '9px', color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Documentation
            </div>
          </div>
        </div>

        {/* Search button */}
        <div style={{ padding: '12px' }}>
          <button
            onClick={handleOpenSearch}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              color: C.faint,
              fontFamily: C.mono, fontSize: '11px',
              cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'border-color 150ms',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${C.accent}60`}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px' }}>⌕</span>
              <span>Search docs</span>
            </div>
            <span style={{ fontSize: '10px', letterSpacing: '0.04em' }}>⌘K</span>
          </button>
        </div>

        {/* Nav label */}
        <div style={{
          padding: '4px 16px 8px',
          fontFamily: C.mono, fontSize: '9px', color: C.faint,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Contents
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflow: 'auto' }}>
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                className="docs-nav-btn"
                onClick={() => scrollToSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 16px',
                  background: isActive ? C.surface : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                  color: isActive ? C.text : C.muted,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: C.mono, fontSize: '12px',
                  letterSpacing: '0.03em',
                }}
              >
                <span style={{ fontSize: '11px', color: isActive ? C.accent : C.faint, flexShrink: 0 }}>
                  {section.icon}
                </span>
                {section.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: `1px solid ${C.border}` }}>
          <a href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: C.mono, fontSize: '11px', color: C.faint,
            textDecoration: 'none', letterSpacing: '0.04em',
            transition: 'color 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.color = C.accent}
            onMouseLeave={e => e.currentTarget.style.color = C.faint}
          >
            <span>←</span> Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main
        ref={contentRef}
        className="docs-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 80px', maxWidth: '860px' }}
      >
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} style={{ marginBottom: '64px' }}>
            {/* Section divider line */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
            }}>
              <div style={{
                width: '24px', height: '24px',
                background: `${C.accent}15`,
                border: `1px solid ${C.accent}30`,
                borderRadius: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '11px', color: C.accent }}>{section.icon}</span>
              </div>
              <h2 style={{
                fontFamily: C.mono, fontSize: '20px', color: C.text,
                fontWeight: 600, letterSpacing: '0.04em', margin: 0,
              }}>
                {section.label}
              </h2>
            </div>

            {content[section.id] ? (
              <div
                dangerouslySetInnerHTML={renderMarkdown(content[section.id])}
                className="doc-content"
              />
            ) : (
              <div style={{
                padding: '24px',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '16px', height: '16px',
                  border: `2px solid ${C.border}`,
                  borderTopColor: C.accent,
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                <span style={{ fontFamily: C.mono, fontSize: '12px', color: C.faint, letterSpacing: '0.06em' }}>
                  Loading...
                </span>
              </div>
            )}
          </section>
        ))}
      </main>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          query={searchQuery}
          setQuery={setSearchQuery}
          results={searchResults}
          onSelect={handleSearchResultClick}
          onClose={() => setShowSearch(false)}
          inputRef={searchInputRef}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Search Modal
const SearchModal = ({ query, setQuery, results, onSelect, onClose, inputRef }) => {
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      className="docs-modal-enter"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '120px',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
    >
      <div style={{
        width: '580px',
        maxHeight: '60vh',
        background: '#11112a',
        border: `1px solid ${C.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Search input */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontFamily: C.mono, fontSize: '16px', color: C.faint }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            style={{
              flex: 1,
              padding: '4px 0',
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontFamily: C.mono, fontSize: '14px',
              letterSpacing: '0.02em',
            }}
          />
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '4px',
              color: C.faint, fontFamily: C.mono, fontSize: '10px',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 && query && (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontFamily: C.mono, fontSize: '12px', color: C.faint, letterSpacing: '0.06em' }}>
                No results found for "{query}"
              </div>
            </div>
          )}

          {results.length === 0 && !query && (
            <div style={{ padding: '24px 16px' }}>
              <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                All Sections
              </div>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  className="search-result-btn"
                  onClick={() => onSelect(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '10px 12px',
                    background: 'transparent', border: 'none',
                    textAlign: 'left', cursor: 'pointer',
                    borderRadius: '6px', transition: 'background 80ms',
                  }}
                >
                  <span style={{ fontFamily: C.mono, fontSize: '12px', color: C.faint }}>{s.icon}</span>
                  <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, letterSpacing: '0.03em' }}>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={i}
              className="search-result-btn"
              onClick={() => onSelect(r.section.id)}
              style={{
                display: 'block', width: '100%', padding: '14px 20px',
                background: 'transparent', border: 'none', textAlign: 'left',
                borderBottom: `1px solid ${C.border}30`, cursor: 'pointer',
                transition: 'background 80ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint }}>{r.section.icon}</span>
                <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.accent, letterSpacing: '0.04em' }}>
                  {r.section.label}
                </span>
              </div>
              <div style={{ fontFamily: C.sans, fontSize: '12px', color: C.faint, lineHeight: 1.5 }}>
                {r.snippet.replace(/[#*`]/g, '')}...
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Docs;