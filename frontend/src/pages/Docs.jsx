import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import { COLORS } from '../utils/constants';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'regime-detection', label: 'Regime Detection' },
  { id: 'microstructure', label: 'Microstructure' },
  { id: 'alt-data', label: 'Alt Data' },
  { id: 'causal-ai', label: 'Causal AI' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'symbols', label: 'Symbol Management' },
  { id: 'performance', label: 'Performance Log' },
  { id: 'faq', label: 'FAQ' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize from URL hash
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash && SECTIONS.find(s => s.id === hash)) {
      setActiveSection(hash);
    }
  }, [location]);

  // Load section content on mount or section change
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

  // Set up IntersectionObserver for active section detection
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

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [content]);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleOpenSearch();
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  // Load all docs for search
  const handleOpenSearch = useCallback(async () => {
    setShowSearch(true);
    if (!searchLoaded) {
      const promises = SECTIONS.map(async (s) => {
        try {
          const res = await fetch(`/docs/${s.id}.md`);
          return { id: s.id, content: await res.text() };
        } catch {
          return { id: s.id, content: '' };
        }
      });
      const results = await Promise.all(promises);
      const contentMap = {};
      results.forEach(r => { contentMap[r.id] = r.content; });
      setAllDocContent(contentMap);
      setSearchLoaded(true);
    }
  }, [searchLoaded]);

  // Search across all content
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

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

  // Navigate to search result
  const handleSearchResultClick = (sectionId) => {
    setActiveSection(sectionId);
    setShowSearch(false);
    setSearchQuery('');
    window.history.replaceState(null, '', `#${sectionId}`);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render markdown with code block copy buttons
  const renderMarkdown = (md) => {
    // Add copy buttons to code blocks
    let html = marked.parse(md);
    
    // Wrap code blocks with copy button
    html = html.replace(
      /<pre><code class="language-(\w+)">/g,
      '<pre class="code-block"><button class="copy-btn" data-code="$1">Copy</button><code class="language-$1">'
    );
    
    const sanitized = DOMPurify.sanitize(html);
    return { __html: sanitized };
  };

  // Syntax highlight after render
  useEffect(() => {
    Prism.highlightAll();
    
    // Add copy button functionality
    document.querySelectorAll('.code-block').forEach((pre) => {
      const btn = pre.querySelector('.copy-btn');
      if (btn && !btn.dataset.attached) {
        btn.dataset.attached = 'true';
        btn.addEventListener('click', () => {
          const code = pre.querySelector('code');
          navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
          });
        });
      }
    });
  }, [content, activeSection]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    window.history.replaceState(null, '', `#${sectionId}`);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b1a', display: 'flex' }}>
      {/* Mobile header */}
      <div style={{ display: 'none' }} className="mobile-header">
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ padding: '12px', background: '#11112a', border: '1px solid #2a2a4a', color: '#fff', cursor: 'pointer' }}
        >
          Menu
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: '240px', background: '#050510', borderRight: '1px solid #2a2a4a',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'
      }} className="sidebar">
        <h2 style={{ padding: '16px', fontSize: '14px', color: '#fff', borderBottom: '1px solid #2a2a4a' }}>
          Documentation
        </h2>
        <nav>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              style={{
                display: 'block', width: '100%', padding: '12px 16px',
                background: activeSection === section.id ? '#11112a' : 'transparent',
                border: 'none', borderLeft: activeSection === section.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
                color: activeSection === section.id ? '#fff' : '#888',
                textAlign: 'left', cursor: 'pointer', fontSize: '13px'
              }}
            >
              {section.label}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: '16px', borderTop: '1px solid #2a2a4a', marginTop: 'auto' }}>
          <button
            onClick={handleOpenSearch}
            style={{
              width: '100%', padding: '8px 12px', background: '#11112a', border: '1px solid #2a2a4a',
              borderRadius: '6px', color: '#666', fontSize: '12px', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between'
            }}
          >
            <span>Search</span>
            <span style={{ fontSize: '10px' }}>Ctrl+K</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main ref={contentRef} style={{ flex: 1, padding: '24px 48px', maxWidth: '800px' }}>
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '16px', fontFamily: 'IBM Plex Mono, monospace' }}>
              {section.label}
            </h2>
            {content[section.id] ? (
              <div
                style={{ color: '#ddddf0', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={renderMarkdown(content[section.id])}
                className="doc-content"
              />
            ) : (
              <div style={{ color: '#666' }}>Loading...</div>
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

      <style>{`
        .doc-content pre { 
          background: #1a1a2e; 
          padding: 16px; 
          border-radius: 6px; 
          overflow-x: auto; 
          position: relative;
        }
        .doc-content .code-block { padding-top: 36px; }
        .doc-content .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          background: #2a2a4a;
          border: none;
          border-radius: 4px;
          color: #888;
          font-size: 11px;
          cursor: pointer;
        }
        .doc-content .copy-btn:hover { background: #3a3a5a; color: #fff; }
        .doc-content code { 
          font-family: 'IBM Plex Mono, monospace'; 
          font-size: 13px; 
        }
        .doc-content pre code { 
          background: none; 
          padding: 0; 
        }
        .doc-content table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 16px 0; 
        }
        .doc-content th, .doc-content td { 
          padding: 8px 12px; 
          border: 1px solid #2a2a4a; 
          text-align: left; 
        }
        .doc-content th { 
          background: #11112a; 
          color: #888; 
        }
        .doc-content h2, .doc-content h3 { 
          color: #fff; 
          margin-top: 24px; 
          margin-bottom: 12px; 
        }
        .doc-content a { 
          color: ${COLORS.cyan}; 
        }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-header { display: block !important; }
        }
      `}</style>
    </div>
  );
};

// Search Modal Component
const SearchModal = ({ query, setQuery, results, onSelect, onClose, inputRef }) => {
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', 
        paddingTop: '100px', zIndex: 1000 
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
    >
      <div style={{ 
        width: '600px', maxHeight: '70vh', background: '#11112a', 
        borderRadius: '8px', overflow: 'hidden' 
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a4a' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
            style={{
              width: '100%', padding: '12px', background: '#0b0b1a', border: 'none',
              borderRadius: '6px', color: '#fff', fontSize: '16px'
            }}
          />
        </div>
        <div style={{ maxHeight: 'calc(70vh - 60px)', overflowY: 'auto' }}>
          {results.length === 0 && query && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
              No results found
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onSelect(r.section.id)}
              style={{
                display: 'block', width: '100%', padding: '12px 16px',
                background: 'transparent', border: 'none', textAlign: 'left',
                borderBottom: '1px solid #2a2a4a', cursor: 'pointer'
              }}
            >
              <div style={{ color: '#fff', fontSize: '14px', marginBottom: '4px' }}>
                {r.section.label}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {r.snippet}...
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Docs;