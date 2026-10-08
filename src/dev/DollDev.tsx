import { useState } from 'react';
import PaperDoll from '../doll/PaperDoll';
import GamLayer from '../doll/GamLayer';
import { colorById, Color, HANG_TRONG } from '../data';
import './dolldev.css';

const DYE_COLOR_IDS = [
  'do-son',
  'vang-nghe',
  'xanh-cham',
  'xanh-luc-ngoc',
  'hong-sen',
  'trang-nga',
  'den-tuyen',
] as const;

export default function DollDev() {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedGamId, setSelectedGamId] = useState<string | null>('doi-tho');

  const colors = DYE_COLOR_IDS.map((id) => colorById(id)).filter(
    (c): c is Color => Boolean(c)
  );

  const activeColor = selectedColorId ? colorById(selectedColorId) : undefined;

  return (
    <div className="dolldev-page">
      <header className="dolldev-header">
        <h1 className="dolldev-title">Paper Doll Composition (?dev=doll)</h1>
        <p className="dolldev-subtitle">
          Three test configurations: nu ao-giao-linh, nu ao-dai (remix), nam ao-tu-than (ao-the)
        </p>
      </header>

      <main className="dolldev-grid">
        {/* Doll 1: nu ao-giao-linh worn [] */}
        <div className="dolldev-card">
          <div className="dolldev-figure-wrap">
            <PaperDoll
              side="nu"
              chapter="ao-giao-linh"
              worn={[]}
              colorHex={activeColor?.hex}
              height={460}
            />
          </div>
          <div className="dolldev-meta">
            <div className="dolldev-meta-title">1. Nữ · Áo giao lĩnh</div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Side:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">nu</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Chapter:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">ao-giao-linh</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Worn:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">[]</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Companions:</span>
              <span className="dolldev-meta-val">xiêm, áo lót giao</span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Colour:</span>
              <span className="dolldev-meta-val">
                {activeColor ? `${activeColor.name} (${activeColor.hex})` : 'Mặc định'}
              </span>
            </div>

            <div className="dolldev-colors-section">
              <div className="dolldev-colors-label">OKLab Dye:</div>
              <div className="dolldev-colors-row">
                {colors.map((c) => {
                  const isSelected = selectedColorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedColorId((prev) => (prev === c.id ? null : c.id))
                      }
                      className={`dolldev-color-btn${isSelected ? ' active' : ''}`}
                      title={`${c.name} (${c.hex})`}
                    >
                      <span
                        className="dolldev-color-swatch"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Doll 2: nu ao-dai worn ['quan-bo-ong-rong','giay-cao-co','tui-deo-cheo','mu-luoi-trai'] */}
        <div className="dolldev-card">
          <div className="dolldev-figure-wrap">
            <PaperDoll
              side="nu"
              chapter="ao-dai"
              worn={[
                'quan-bo-ong-rong',
                'giay-cao-co',
                'tui-deo-cheo',
                'mu-luoi-trai',
              ]}
              height={460}
            />
          </div>
          <div className="dolldev-meta">
            <div className="dolldev-meta-title">2. Nữ · Áo dài (phối hiện đại)</div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Side:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">nu</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Chapter:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">ao-dai</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Worn:</span>
              <span className="dolldev-meta-val">
                <code className="dolldev-code">
                  quan-bo-ong-rong, giay-cao-co, tui-deo-cheo, mu-luoi-trai
                </code>
              </span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Note:</span>
              <span className="dolldev-meta-val">quần bò ống rộng thay cho quần lụa</span>
            </div>
          </div>
        </div>

        {/* Doll 3: nam ao-tu-than worn [] (it must be áo the) */}
        <div className="dolldev-card">
          <div className="dolldev-figure-wrap">
            <PaperDoll
              side="nam"
              chapter="ao-tu-than"
              worn={[]}
              height={460}
            />
          </div>
          <div className="dolldev-meta">
            <div className="dolldev-meta-title">3. Nam · Áo tứ thân (Áo the)</div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Side:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">nam</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Chapter:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">ao-tu-than</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Worn:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">[]</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Garment:</span>
              <span className="dolldev-meta-val">áo the (tự động chuyển qua gidOf)</span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Companions:</span>
              <span className="dolldev-meta-val">quần lụa, áo lót trắng, khăn xếp</span>
            </div>
          </div>
        </div>

        {/* Doll 4: nu ao-tac with Gấm layer */}
        <div className="dolldev-card">
          <div className="dolldev-figure-wrap">
            <PaperDoll
              side="nu"
              chapter="ao-tac"
              worn={[]}
              height={460}
            >
              {selectedGamId ? (
                <GamLayer
                  side="nu"
                  chapter="ao-tac"
                  worn={[]}
                  gamId={selectedGamId}
                  height={460}
                />
              ) : null}
            </PaperDoll>
          </div>
          <div className="dolldev-meta">
            <div className="dolldev-meta-title">4. Nữ · Áo tấc (Gấm hoa văn chìm)</div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Side:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">nu</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Chapter:</span>
              <span className="dolldev-meta-val"><code className="dolldev-code">ao-tac</code></span>
            </div>
            <div className="dolldev-meta-row">
              <span className="dolldev-meta-label">Gấm:</span>
              <span className="dolldev-meta-val">
                {selectedGamId
                  ? HANG_TRONG.gam.find((g) => g.id === selectedGamId)?.label
                  : 'Tắt (Trơn)'}
              </span>
            </div>

            <div className="dolldev-colors-section">
              <div className="dolldev-colors-label">Họa tiết Gấm:</div>
              <div className="dolldev-colors-row">
                {HANG_TRONG.gam.map((g) => {
                  const isSelected = selectedGamId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setSelectedGamId((prev) => (prev === g.id ? null : g.id))
                      }
                      className={`dolldev-color-btn${isSelected ? ' active' : ''}`}
                    >
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
