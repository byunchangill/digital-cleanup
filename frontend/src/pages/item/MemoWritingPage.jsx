import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMemo } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

/**
 * memo_writing_add_004 — 메모 작성 (/items/new-memo)
 * 계약 ITEM-02: title/body/tags/category/vaulted 전송. attachmentIds는 사전 업로드 참조라
 *   본 화면 미디어 첨부는 [가정] 후속 연동(업로드 UI 미제공) → 안내 토스트만.
 * 서식 툴바(굵게/목록/링크/mic)는 [가정] 클라이언트 서식/STT 로 계약 없음 → 시각 재현만.
 */
export default function MemoWritingPage() {
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState('');
  const [vaulted, setVaulted] = useState(false);
  const [showClassify, setShowClassify] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagDraft('');
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await createMemo({ title, body, tags, category: category || undefined, vaulted });
      show('메모가 라이브러리에 저장되었습니다', { icon: 'check_circle' });
      setTimeout(() => navigate('/library'), 900);
    } catch (err) {
      show(err.message || '저장에 실패했습니다.', { icon: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface-bright text-on-surface min-h-screen flex flex-col">
      {/* AppBar */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-container-padding h-16">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-primary">새 메모</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={busy}
          className="bg-primary text-on-primary px-6 py-2 rounded-xl font-body-md text-body-md font-bold hover:opacity-90 transition-all active:scale-95 memo-shadow disabled:opacity-60"
        >
          저장
        </button>
      </header>

      {/* Editor */}
      <main className="flex-1 px-container-padding pt-8 pb-32 max-w-2xl mx-auto w-full">
        <div className="flex flex-col space-y-6">
          {/* Tag chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-label-caps text-label-caps bg-surface-container-low text-primary px-3 py-1 rounded-full border border-surface-border">
              # {title.trim() || '제목 없음'}
            </span>
            <span className="font-label-caps text-label-caps bg-secondary-container/20 text-secondary px-3 py-1 rounded-full border border-secondary/10 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              AI 추천: 초안
            </span>
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                className="font-label-caps text-label-caps bg-primary/10 text-primary px-3 py-1 rounded-full cursor-pointer"
              >
                #{t} ✕
              </span>
            ))}
          </div>

          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 font-headline-lg-mobile text-headline-lg-mobile placeholder:text-outline-variant text-on-surface p-0"
            placeholder="제목을 입력하세요..."
            type="text"
          />

          <div className="h-[1px] w-full bg-surface-border" />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full flex-1 min-h-[353px] bg-transparent border-none focus:ring-0 font-body-lg text-body-lg placeholder:text-outline-variant text-on-surface-variant p-0 resize-none"
            placeholder="여기에 생각을 적어보세요..."
          />

          {/* Bento cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-gutter mt-8">
            <div
              onClick={() => show('미디어 첨부는 준비 중입니다.', { icon: 'info' })}
              className="rounded-xl bg-surface-container-lowest border border-surface-border p-4 memo-shadow group cursor-pointer hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined">image</span>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary">add_circle</span>
              </div>
              <p className="font-headline-sm text-headline-sm">미디어 첨부</p>
              <p className="font-caption text-caption text-text-muted mt-1">스크린샷이나 사진을 업로드하세요</p>
            </div>

            <div
              onClick={() => setShowClassify((v) => !v)}
              className="rounded-xl bg-surface-container-lowest border border-surface-border p-4 memo-shadow group cursor-pointer hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-secondary-container/10 rounded-lg text-secondary">
                  <span className="material-symbols-outlined">label</span>
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary">settings</span>
              </div>
              <p className="font-headline-sm text-headline-sm">분류</p>
              <p className="font-caption text-caption text-text-muted mt-1">태그를 추가하거나 보관함으로 이동</p>
            </div>
          </div>

          {/* 분류 확장 패널 */}
          {showClassify && (
            <div className="rounded-xl bg-surface-container-low border border-surface-border p-4 space-y-4">
              <div>
                <label className="font-label-caps text-label-caps text-text-muted block mb-2">카테고리</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 아이디어"
                  className="w-full bg-surface-container-lowest border border-surface-border rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-text-muted block mb-2">태그 추가</label>
                <div className="flex gap-2">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="태그 입력 후 Enter"
                    className="flex-1 bg-surface-container-lowest border border-surface-border rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button onClick={addTag} className="px-4 rounded-lg bg-primary text-on-primary font-body-md">
                    추가
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toolbar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-inverse-surface text-inverse-on-surface rounded-full h-14 flex items-center justify-between px-6 memo-shadow z-50">
        <div className="flex items-center gap-6">
          <button className="hover:text-primary-fixed-dim transition-colors">
            <span className="material-symbols-outlined">format_bold</span>
          </button>
          <button className="hover:text-primary-fixed-dim transition-colors">
            <span className="material-symbols-outlined">format_list_bulleted</span>
          </button>
          <button className="hover:text-primary-fixed-dim transition-colors">
            <span className="material-symbols-outlined">link</span>
          </button>
          <div className="w-[1px] h-6 bg-outline" />
          <button className="hover:text-primary-fixed-dim transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined">mic</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setVaulted((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
              vaulted ? 'bg-primary-fixed-dim/30' : 'hover:bg-surface-variant/20'
            }`}
          >
            <span className="material-symbols-outlined text-primary-fixed-dim" style={vaulted ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              lock
            </span>
            <span className="font-label-caps text-label-caps">비밀 보관함{vaulted ? ' ✓' : ''}</span>
          </button>
        </div>
      </div>

      <Toast {...toast} shape="rounded" />
    </div>
  );
}
