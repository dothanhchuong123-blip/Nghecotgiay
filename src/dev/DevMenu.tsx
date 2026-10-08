import { useEffect, useState } from 'react';
import './devmenu.css';

const DEV_LINKS = ['app', 'art', 'kit', 'engine', 'doll', 'rules'] as const;

export default function DevMenu() {
  const devParam =
    typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('dev')
      : null;
  const currentDev = devParam || 'app';
  const isDevPage = Boolean(devParam && devParam !== 'app');
  const [isOpen, setIsOpen] = useState<boolean>(isDevPage);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return null;
  }

  function getHref(target: string) {
    if (typeof window === 'undefined') return '#';
    const url = new URL(window.location.href);
    if (target === 'app') {
      url.searchParams.delete('dev');
    } else {
      url.searchParams.set('dev', target);
    }
    return url.pathname + url.search + url.hash;
  }

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, target: string) {
    e.preventDefault();
    const url = new URL(window.location.href);
    if (target === 'app') {
      url.searchParams.delete('dev');
    } else {
      url.searchParams.set('dev', target);
    }
    window.location.href = url.toString();
  }

  return (
    <div className="devmenu-panel">
      <nav className="devmenu-links">
        {DEV_LINKS.map((link) => {
          const isActive = currentDev === link;
          return (
            <a
              key={link}
              href={getHref(link)}
              onClick={(e) => handleClick(e, link)}
              className={`devmenu-link${isActive ? ' devmenu-link-active' : ''}`}
            >
              {link}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
