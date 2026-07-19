import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importPhotos } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * gallery_import_add_002 — 갤러리 가져오기 (/import)
 * [가정] 브라우저는 기기 갤러리를 임의로 못 읽으므로, <input type=file multiple>로 사진을 고른다.
 *   화면 HTML의 3열 썸네일 그리드 + 다중 선택 토글 + 카운터 버튼 디자인은 그대로 재현.
 * 탭(모든 사진/스크린샷만 보기) → sourceType(PHOTO|SCREENSHOT) 힌트로 매핑(계약 ITEM-01).
 */
export default function GalleryImportPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('all'); // all | screenshots
  const [photos, setPhotos] = useState([]); // { file, url, selected }
  const [busy, setBusy] = useState(false);

  const selectedCount = photos.filter((p) => p.selected).length;

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file), selected: true }));
    setPhotos((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const toggle = (i) =>
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? { ...p, selected: !p.selected } : p)));

  const handleImport = async () => {
    const files = photos.filter((p) => p.selected).map((p) => p.file);
    if (!files.length) return;
    setBusy(true);
    try {
      const data = await importPhotos(files, tab === 'screenshots' ? 'SCREENSHOT' : 'PHOTO');
      show(`사진 ${data.importedCount}장을 가져왔습니다.`, { icon: 'check_circle' });
      setTimeout(() => navigate('/library'), 800);
    } catch (err) {
      show(err.message || '가져오기에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const tabClass = (active) =>
    `font-label-caps text-label-caps pb-2 border-b-2 transition-all ${
      active ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-on-surface'
    }`;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-background sticky top-0 z-50 flex items-center justify-between px-container-padding py-stack-gap-sm w-full">
        <div className="flex items-center gap-stack-gap-md">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-on-surface">close</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">갤러리 가져오기</h1>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="font-label-caps text-label-caps text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
        >
          앨범
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="px-container-padding py-stack-gap-sm flex gap-stack-gap-md border-b border-surface-border bg-background">
        <button className={tabClass(tab === 'all')} onClick={() => setTab('all')}>
          모든 사진
        </button>
        <button className={tabClass(tab === 'screenshots')} onClick={() => setTab('screenshots')}>
          스크린샷만 보기
        </button>
      </div>

      {/* Gallery Canvas */}
      <main className="flex-1 px-container-padding pt-stack-gap-md pb-32">
        <div className="grid grid-cols-3 gap-grid-gutter">
          {/* Add tile — 기기 사진 선택 */}
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-outline hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
            <span className="font-label-caps text-[10px] mt-1">사진 추가</span>
          </button>

          {photos.map((p, i) => (
            <div
              key={i}
              onClick={() => toggle(i)}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer select-none"
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${p.url}')` }} />
              <div
                className={`absolute top-2 right-2 w-6 h-6 border-2 border-white rounded-full flex items-center justify-center transition-all ${
                  p.selected ? 'bg-primary' : 'bg-black/20'
                }`}
              >
                <span className={`material-symbols-outlined text-[16px] text-white ${p.selected ? '' : 'hidden'}`}>
                  check
                </span>
              </div>
              {p.selected && (
                <div className="absolute inset-0" style={{ background: 'rgba(79,70,229,0.4)', border: '3px solid #4f46e5' }} />
              )}
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <p className="text-center text-text-muted font-body-md mt-16">
            상단 <span className="font-semibold">앨범</span> 또는 <span className="font-semibold">사진 추가</span>로
            <br />기기 사진을 선택하세요.
          </p>
        )}
      </main>

      {/* Floating Import Button */}
      <div className="fixed bottom-0 left-0 w-full px-container-padding pb-8 pt-4 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
        <button
          onClick={handleImport}
          disabled={selectedCount === 0 || busy}
          className={`w-full bg-primary-container text-on-primary-container h-14 rounded-xl font-headline-sm text-headline-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-stack-gap-md hover:brightness-110 transition-all ${
            selectedCount === 0 || busy ? 'opacity-50 grayscale' : ''
          }`}
        >
          사진 <span>{selectedCount}</span>장 가져오기
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      <Toast {...toast} shape="rounded" />
    </div>
  );
}
