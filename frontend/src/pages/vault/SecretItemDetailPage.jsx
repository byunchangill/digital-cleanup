import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVaultItem } from '../../api/vaultApi';
import { vaultUnlocked } from '../../api/vaultToken';
import { toggleVault, shareItems, deleteItems } from '../../api/itemApi';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import formatBytes from '../../lib/formatBytes';

/**
 * secret_item_detail_my_003(이미지형) + _2(문서형) 통합 — /vault/items/:id
 * VAULT-04 마스킹 해제 열람(볼트 세션 필요). 세션 없으면 잠김 오버레이 → /vault/unlock 유도.
 * 액션: ITEM-12 일반 보관함 이동, ITEM-13 안전하게 공유, ITEM-09 삭제 (모두 볼트 세션 활성 시).
 * [가정] 자동 삭제/아카이브 문구는 expiryDate 기반 클라이언트 계산(정책은 cleanup 소관).
 */
function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

const IMAGE_TYPES = ['IMAGE', 'SCREENSHOT'];

export default function SecretItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [item, setItem] = useState(null);
  const [locked, setLocked] = useState(!vaultUnlocked());

  useEffect(() => {
    if (!vaultUnlocked()) {
      setLocked(true);
      return;
    }
    let alive = true;
    getVaultItem(id)
      .then((d) => alive && (setItem(d.item), setLocked(false)))
      .catch((e) => {
        if (!alive) return;
        if (e.code === 'VAULT_LOCKED') setLocked(true);
        else show(e.message || '불러오지 못했습니다.', { icon: 'error' });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goUnlock = () => navigate(`/vault/unlock?next=${encodeURIComponent(`/vault/items/${id}`)}`);

  const onMoveToGeneral = async () => {
    try {
      await toggleVault(item.id, false);
      show('일반 보관함으로 이동했습니다.', { icon: 'lock_open' });
      setTimeout(() => navigate(`/items/${item.id}`, { replace: true }), 700);
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  const onShare = async () => {
    try {
      const d = await shareItems([item.id]); // 볼트 세션 X-Vault-Token 자동 동봉(인터셉터)
      show('안전 공유 링크를 생성했습니다.', { icon: 'link' });
      if (navigator.clipboard && d?.shareUrl) navigator.clipboard.writeText(d.shareUrl).catch(() => {});
    } catch (e) {
      show(e.code === 'VAULT_LOCKED' ? '볼트 세션이 만료되었습니다. 다시 잠금 해제하세요.' : e.message, { icon: 'error' });
    }
  };

  const onDelete = async () => {
    try {
      const d = await deleteItems([item.id]);
      if (d.deletedCount === 0) return show('삭제에 실패했습니다.', { icon: 'error' });
      show('삭제했습니다.', { icon: 'delete' });
      setTimeout(() => navigate('/library'), 700);
    } catch (e) {
      show(e.message, { icon: 'error' });
    }
  };

  // ── 잠김 상태: 블러 오버레이 + 잠금 해제 유도 ──
  if (locked) {
    return (
      <div className="bg-surface text-on-surface min-h-screen font-body-md flex flex-col">
        <VaultHeader onBack={() => navigate(-1)} />
        <main className="flex-grow px-container-padding pt-20 pb-24">
          <div className="relative w-full aspect-[3/4] mt-stack-gap-md overflow-hidden rounded-xl bg-on-background shadow-lg">
            <div className="absolute inset-0 backdrop-blur-2xl bg-white/40" />
            <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-stack-gap-md">
                <span className="material-symbols-outlined text-white text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <p className="font-headline-sm text-headline-sm text-on-background mb-2">민감한 콘텐츠</p>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[200px]">
                이 항목을 보려면 PIN으로 잠금을 해제하세요
              </p>
              <button
                onClick={goUnlock}
                className="mt-8 px-6 py-3 bg-white/80 backdrop-blur-md border border-outline-variant rounded-full font-headline-sm text-primary flex items-center gap-2 hover:bg-white transition-colors active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined">fingerprint</span>
                탭하여 잠금 해제
              </button>
            </div>
          </div>
        </main>
        <Toast {...toast} shape="rounded" iconClassName="text-secondary-fixed" />
      </div>
    );
  }

  if (!item) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">불러오는 중...</div>;
  }

  const isImage = IMAGE_TYPES.includes(item.type);
  const expDays = daysUntil(item.expiryDate);

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md flex flex-col overflow-x-hidden">
      <VaultHeader
        onBack={() => navigate(-1)}
        onShare={onShare}
        onDelete={onDelete}
      />

      <main className="flex-grow px-container-padding pt-20 pb-32 max-w-lg mx-auto w-full">
        {/* Unlocked Asset */}
        <div className="relative w-full aspect-[3/4] mt-stack-gap-md mb-stack-gap-lg overflow-hidden rounded-xl bg-on-background shadow-lg">
          {item.fileUrl ? (
            <img alt={item.title} className="w-full h-full object-cover" src={item.fileUrl} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-5xl">description</span>
            </div>
          )}
          <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-emerald-500/90 text-white rounded-full flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">lock_open</span>
            <span className="text-[12px] font-bold">잠금 해제됨</span>
          </div>
        </div>

        <div className="space-y-stack-gap-lg">
          {/* Title & status */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps rounded-sm">비밀</span>
                <span className="text-text-muted text-caption">{formatDate(item.savedAt)} 저장</span>
              </div>
              {item.verified && (
                <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  인증됨
                </span>
              )}
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-text-main">{item.title}</h2>
            {item.subtitle && <p className="text-text-muted mt-1">{item.subtitle}</p>}
          </section>

          {/* AI Summary */}
          {item.aiSummary && (
            <div className="p-stack-gap-md bg-surface-container-highest/50 rounded-xl border border-surface-border">
              <div className="flex items-center gap-2 mb-stack-gap-sm">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-headline-sm text-[16px] text-primary">AI 분석</span>
              </div>
              <p className="font-body-md text-on-surface-variant leading-relaxed">{item.aiSummary}</p>
            </div>
          )}

          {/* AI Tags */}
          {item.tags?.length > 0 && (
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">AI 큐레이션 태그</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((t) => (
                  <span key={t} className="bg-surface-container-high text-primary px-3 py-1 rounded-full font-body-md text-caption border border-primary/10">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-stack-gap-md">
            <h3 className="font-label-caps text-label-caps text-text-muted tracking-widest uppercase">파일 메타데이터</h3>
            <div className="grid grid-cols-2 gap-stack-gap-md">
              <MetaCard label="형식" value={item.mimeType || (isImage ? '이미지' : '문서')} />
              <MetaCard label="용량" value={item.fileSize != null ? formatBytes(item.fileSize) : '-'} />
              <MetaCard label="출처" value={item.sourceApp || '알 수 없음'} />
              {isImage && item.resolution && <MetaCard label="해상도" value={item.resolution} />}
            </div>
          </div>

          {/* Cleanup warning (expiryDate 기반) */}
          {expDays != null && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              <div>
                <p className="font-body-md text-body-md font-semibold text-amber-900">{expDays}일 후 자동 삭제 설정됨</p>
                <p className="font-caption text-caption text-amber-700">이 항목은 {formatDate(item.expiryDate)}에 아카이브로 이동됩니다.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-stack-gap-md space-y-3">
            <button
              onClick={onMoveToGeneral}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-headline-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">shield_lock</span>
              일반 보관함으로 이동
            </button>
            <button
              onClick={() => show('수정 화면은 준비 중입니다.', { icon: 'info' })}
              className="w-full h-12 bg-surface text-on-surface-variant border border-surface-border rounded-xl font-headline-sm flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">edit</span>
              항목 상세 수정
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 w-full bg-white px-container-padding pb-10 pt-4 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)] z-40 flex items-center gap-4">
        <button
          onClick={onShare}
          className="flex-1 py-4 bg-primary text-white rounded-xl font-headline-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
          안전하게 공유
        </button>
        <button
          onClick={onDelete}
          className="w-14 h-14 bg-surface-container-high text-primary rounded-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>

      <Toast {...toast} shape="rounded" iconClassName="text-secondary-fixed" />
    </div>
  );
}

function VaultHeader({ onBack, onShare, onDelete }) {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-surface/80 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-stack-gap-md">
        <button onClick={onBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
          <span className="material-symbols-outlined text-primary">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-on-surface">비밀 항목 상세</h1>
      </div>
      <div className="flex items-center gap-stack-gap-sm">
        {onShare && (
          <button onClick={onShare} className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined text-on-surface-variant">share</span>
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined text-error">delete</span>
          </button>
        )}
      </div>
    </header>
  );
}

function MetaCard({ label, value }) {
  return (
    <div className="p-3 bg-surface-container-low rounded-lg">
      <p className="text-caption text-text-muted">{label}</p>
      <p className="font-body-lg text-text-main font-medium">{value}</p>
    </div>
  );
}
