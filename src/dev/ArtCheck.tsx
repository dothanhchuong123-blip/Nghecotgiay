import { useEffect, useState } from 'react';
import scenesData from '../data/scenes.json';
import { HANG_TRONG } from '../data';
import { useStore, setCollage, CollageLevel } from '../state';
import './artcheck.css';

interface ManifestData {
  canvas?: { w: number; h: number };
  bodies?: Record<string, string>;
  pieces?: Array<{
    id?: string;
    side?: string;
    layer?: string;
    src?: string;
    dye?: string;
  }>;
}

interface ImageCardItem {
  path: string;
  status: 'loading' | 'loaded' | 'failed';
  width?: number;
  height?: number;
}

export default function ArtCheck() {
  const [generalItems, setGeneralItems] = useState<ImageCardItem[]>([]);
  const [hangTrongItems, setHangTrongItems] = useState<ImageCardItem[]>([]);

  useEffect(() => {
    let isCancelled = false;

    // 1. Prepare Hàng Trống paths
    const htPaths: string[] = [
      ...Object.values(HANG_TRONG.papers).map((p) => p.src),
      ...HANG_TRONG.gam.map((g) => g.src),
      HANG_TRONG.weave.card,
      ...HANG_TRONG.weave.strips.map((s) => s.src),
    ];

    setHangTrongItems(htPaths.map((path) => ({ path, status: 'loading' })));

    htPaths.forEach((path, index) => {
      const img = new Image();
      img.onload = () => {
        if (isCancelled) return;
        setHangTrongItems((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              path,
              status: 'loaded',
              width: img.naturalWidth,
              height: img.naturalHeight,
            };
          }
          return next;
        });
      };
      img.onerror = () => {
        if (isCancelled) return;
        console.log(`[art missing] ${path}`);
        setHangTrongItems((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              path,
              status: 'failed',
            };
          }
          return next;
        });
      };
      img.src = path;
    });

    // 2. Prepare general assets
    async function loadGeneralAssets() {
      const manifestPaths: string[] = [];
      try {
        const response = await fetch('/doll/manifest.json');
        if (response.ok) {
          const manifest: ManifestData = await response.json();
          if (manifest.bodies) {
            for (const bodyPath of Object.values(manifest.bodies)) {
              if (typeof bodyPath === 'string') {
                manifestPaths.push(bodyPath);
              }
            }
          }
          if (Array.isArray(manifest.pieces)) {
            for (const piece of manifest.pieces) {
              if (piece.src) {
                manifestPaths.push(piece.src);
              }
              if (piece.dye) {
                manifestPaths.push(piece.dye);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load /doll/manifest.json', err);
      }

      const scenePaths: string[] = [];
      const scenes = scenesData.scenes as Record<
        string,
        {
          wings?: boolean;
          mid?: string | null;
          prop?: string | null;
          full?: string[];
        }
      >;

      if (scenes) {
        for (const [id, scene] of Object.entries(scenes)) {
          scenePaths.push(`/popcard/${id}/back.webp`);
          scenePaths.push(`/popcard/${id}/fg.webp`);
          scenePaths.push(`/popcard/${id}/prop.webp`);
          if (scene.mid !== null && scene.mid !== undefined) {
            scenePaths.push(`/popcard/${id}/mid.webp`);
          }
          if (scene.wings === true) {
            scenePaths.push(`/popcard/${id}/wing-l.webp`);
            scenePaths.push(`/popcard/${id}/wing-r.webp`);
          }
          if (Array.isArray(scene.full)) {
            for (const side of scene.full) {
              scenePaths.push(`/popcard/${id}/full-${side}.webp`);
            }
          }
        }
      }

      const allGeneral = [...manifestPaths, ...scenePaths, '/book/ban-3d.jpg'];
      if (isCancelled) return;

      setGeneralItems(allGeneral.map((path) => ({ path, status: 'loading' })));

      allGeneral.forEach((path, index) => {
        const img = new Image();
        img.onload = () => {
          if (isCancelled) return;
          setGeneralItems((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                path,
                status: 'loaded',
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
            }
            return next;
          });
        };
        img.onerror = () => {
          if (isCancelled) return;
          console.log(`[art missing] ${path}`);
          setGeneralItems((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                path,
                status: 'failed',
              };
            }
            return next;
          });
        };
        img.src = path;
      });
    }

    loadGeneralAssets();

    return () => {
      isCancelled = true;
    };
  }, []);

  const allItems = [...hangTrongItems, ...generalItems];
  const loadedCount = allItems.filter((item) => item.status === 'loaded').length;
  const failedCount = allItems.filter((item) => item.status === 'failed').length;
  const totalCount = allItems.length;
  const { state, dispatch } = useStore();

  const renderGrid = (itemList: ImageCardItem[]) => (
    <div className="artcheck-grid">
      {itemList.map((item, idx) => (
        <div
          key={`${item.path}-${idx}`}
          className={`artcheck-card${item.status === 'failed' ? ' artcheck-card-failed' : ''}`}
        >
          <div className="artcheck-picture-wrap">
            {item.status === 'loaded' ? (
              <img
                src={item.path}
                alt={item.path}
                className="artcheck-img"
              />
            ) : item.status === 'failed' ? (
              <span className="artcheck-failed-badge">missing</span>
            ) : null}
          </div>
          <div className="artcheck-card-content">
            <div className="artcheck-path">{item.path}</div>
            <div className="artcheck-meta">
              {item.status === 'loaded' ? (
                <>
                  <span className="artcheck-badge-ok">OK</span>
                  {item.width ? ` · ${item.width}×${item.height}` : ''}
                </>
              ) : item.status === 'failed' ? (
                <span className="artcheck-badge-missing">missing</span>
              ) : (
                '...'
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="artcheck-page">
      <div className="artcheck-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {loadedCount} loaded, {failedCount} failed, {totalCount} total
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>Collage level:</span>
          {([1, 2, 3] as CollageLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => dispatch(setCollage(lvl))}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #8B2500',
                background: state.collage === lvl ? '#8B2500' : '#FFFDF7',
                color: state.collage === lvl ? '#FFFDF7' : '#8B2500',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              collage {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="artcheck-group">
        <div className="artcheck-group-header">
          <h2 className="artcheck-group-title">Hàng Trống</h2>
          <div className="artcheck-group-stats">
            {hangTrongItems.filter((i) => i.status === 'loaded').length}/{hangTrongItems.length} OK
          </div>
        </div>
        {renderGrid(hangTrongItems)}
      </div>

      <div className="artcheck-group">
        <div className="artcheck-group-header">
          <h2 className="artcheck-group-title">Búp bê & Sách</h2>
          <div className="artcheck-group-stats">
            {generalItems.filter((i) => i.status === 'loaded').length}/{generalItems.length} OK
          </div>
        </div>
        {renderGrid(generalItems)}
      </div>
    </div>
  );
}
