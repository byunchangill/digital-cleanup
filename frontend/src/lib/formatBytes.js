/**
 * 계약이 용량을 bytes(number)로 반환하므로 표시용 GB/MB 포맷은 프론트가 수행(specs/cleanup.md [가정]).
 * cleanup 화면 4종(대시보드/중복/리포트/설정)에서 공용.
 */
export default function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '0MB';
  const GB = 1073741824;
  const MB = 1048576;
  const KB = 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)}GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)}MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(0)}KB`;
  return `${bytes}B`;
}
