package com.sortmate.home.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.home.dto.CleanupSuggestion;
import com.sortmate.home.dto.DashboardResponse;
import com.sortmate.home.dto.RefinedFilter;
import com.sortmate.home.dto.SearchInterpretation;
import com.sortmate.home.dto.SearchResponse;
import com.sortmate.home.dto.SearchResultItem;
import com.sortmate.item.dto.CategoryListResponse.CategoryCount;
import com.sortmate.item.dto.ItemDto;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HOME-01 대시보드 집계 + HOME-02 자연어 검색.
 * home 전용 엔티티 없이 기존 Item 위의 집계·검색 뷰다.
 * ponytail: 소유자 전체 아이템 인메모리 스캔(O(n)) — 데모/개인 스케일 충분. 대규모 시 전문검색/인덱스로 승격.
 */
@Service
public class HomeService {

    static final int DEFAULT_RECENT = 10;
    static final int MAX_RECENT = 20;
    static final int DEFAULT_SIZE = 20;
    static final int MAX_SIZE = 100;

    private final ItemRepository itemRepository;
    private final ZoneId zone = ZoneId.systemDefault();

    public HomeService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    // ── HOME-01 대시보드 ───────────────────────────────────────
    @Transactional(readOnly = true)
    public DashboardResponse dashboard(Long ownerId, Integer recentSizeRaw) {
        int recentSize = recentSizeRaw == null ? DEFAULT_RECENT : recentSizeRaw;
        if (recentSize < 1 || recentSize > MAX_RECENT) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "recentSize는 1~" + MAX_RECENT + " 범위여야 합니다.");
        }

        List<Item> all = itemRepository.findByOwnerId(ownerId);

        List<CleanupSuggestion> suggestions = new ArrayList<>();
        long duplicates = countDuplicatePhotos(all);
        if (duplicates > 0) {
            suggestions.add(new CleanupSuggestion("DUPLICATE_PHOTOS",
                    "중복 사진 " + duplicates + "건이 있어요", duplicates,
                    "정리하기", "/cleanup/duplicates"));
        }
        long expiring = all.stream().filter(Item::isExpiringSoon).count();
        if (expiring > 0) {
            suggestions.add(new CleanupSuggestion("EXPIRING_ITEMS",
                    "만료 임박 항목 " + expiring + "건이 있어요", expiring,
                    "확인하기", "/library?filter=expiring"));
        }

        // recentItems: ITEM-03 기본과 동일하게 vault 제외, savedAt desc.
        List<ItemDto> recentItems = all.stream()
                .filter(i -> !i.isVaulted())
                .sorted(Comparator.comparing(Item::getSavedAt).reversed())
                .limit(recentSize)
                .map(ItemDto::of)
                .toList();

        // categories: ITEM-14와 동일 집계 재사용.
        List<CategoryCount> categories = itemRepository.aggregateCategories(ownerId).stream()
                .map(c -> new CategoryCount(c.getName(), c.getCnt()))
                .toList();

        return new DashboardResponse(suggestions, recentItems, categories);
    }

    /** 중복 사진: IMAGE/SCREENSHOT을 정규화 제목으로 묶어 그룹당 초과분 합계. */
    long countDuplicatePhotos(List<Item> items) {
        Map<String, Integer> byTitle = new LinkedHashMap<>();
        for (Item i : items) {
            if (i.getType() != ItemType.IMAGE && i.getType() != ItemType.SCREENSHOT) {
                continue;
            }
            String key = i.getTitle() == null ? "" : i.getTitle().trim().toLowerCase(Locale.ROOT);
            byTitle.merge(key, 1, Integer::sum);
        }
        return byTitle.values().stream().filter(c -> c > 1).mapToLong(c -> c - 1).sum();
    }

    // ── HOME-02 자연어 검색 ────────────────────────────────────
    @Transactional(readOnly = true)
    public SearchResponse search(Long ownerId, String q, String mode, Boolean favorite,
                                 String category, int page, int size) {
        String query = q == null ? "" : q.trim();
        if (query.isEmpty() || query.length() > 200) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "q는 1~200자여야 합니다.");
        }
        String searchMode = (mode == null || mode.isBlank()) ? "NORMAL" : mode.trim().toUpperCase(Locale.ROOT);
        if (!searchMode.equals("NORMAL") && !searchMode.equals("ASSISTANT")) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "mode는 NORMAL|ASSISTANT만 허용됩니다.");
        }
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        int pageSize = Math.min(Math.max(size, 1), MAX_SIZE);

        // 1) 질의 해석
        Optional<ItemType> typeInterp = detectType(query);
        Optional<PeriodMatch> periodInterp = detectPeriod(query);
        List<String> keywords = extractKeywords(query);
        List<SearchInterpretation> interpretations =
                buildInterpretations(typeInterp, periodInterp, keywords, query);

        // 2) 후보 필터링 + 점수화
        List<Item> all = itemRepository.findByOwnerId(ownerId);
        List<ScoredItem> scored = new ArrayList<>();
        boolean hasKeywords = !keywords.isEmpty();
        for (Item item : all) {
            if (typeInterp.isPresent() && item.getType() != typeInterp.get()) {
                continue;
            }
            if (periodInterp.isPresent() && !periodInterp.get().matches(localDate(item))) {
                continue;
            }
            if (favorite != null && item.isFavorite() != favorite) {
                continue;
            }
            if (category != null && !category.isBlank() && !category.equals(item.getCategory())) {
                continue;
            }
            int keywordHits = countKeywordHits(item, keywords);
            // 키워드가 있으면 최소 1개 일치 필요. 키워드가 없으면(순수 유형/기간 질의) 필터 통과분 모두 포함.
            if (hasKeywords && keywordHits == 0) {
                continue;
            }
            scored.add(new ScoredItem(item, score(keywordHits, keywords.size(),
                    typeInterp.isPresent(), periodInterp.isPresent())));
        }
        scored.sort(Comparator.comparingInt((ScoredItem s) -> s.score()).reversed()
                .thenComparing(s -> s.item().getSavedAt(), Comparator.reverseOrder()));

        // 3) 페이지네이션(인메모리)
        long total = scored.size();
        int from = Math.min(page * pageSize, scored.size());
        int to = Math.min(from + pageSize, scored.size());
        List<SearchResultItem> results = scored.subList(from, to).stream()
                .map(s -> SearchResultItem.of(s.item(), s.score()))
                .toList();
        int totalPages = (int) Math.ceil((double) total / pageSize);
        boolean hasNext = (page + 1) < totalPages;

        // 4) 상세 필터 추천 + AI 힌트
        List<RefinedFilter> refinedFilters = results.isEmpty()
                ? List.of() : buildRefinedFilters(scored, favorite);
        String assistantHint = buildAssistantHint(searchMode, results.isEmpty(), keywords);

        return new SearchResponse(query, interpretations, results, refinedFilters,
                assistantHint, page, pageSize, total, totalPages, hasNext);
    }

    // ── 해석 헬퍼 ──────────────────────────────────────────────

    private static final Map<String, ItemType> TYPE_WORDS = Map.ofEntries(
            Map.entry("스크린샷", ItemType.SCREENSHOT), Map.entry("캡처", ItemType.SCREENSHOT),
            Map.entry("캡쳐", ItemType.SCREENSHOT), Map.entry("사진", ItemType.IMAGE),
            Map.entry("이미지", ItemType.IMAGE), Map.entry("링크", ItemType.LINK),
            Map.entry("url", ItemType.LINK), Map.entry("문서", ItemType.DOCUMENT),
            Map.entry("pdf", ItemType.DOCUMENT), Map.entry("자료", ItemType.DOCUMENT),
            Map.entry("메모", ItemType.MEMO), Map.entry("노트", ItemType.MEMO));

    private static final Map<String, String> TYPE_LABELS = Map.of(
            "SCREENSHOT", "스크린샷", "IMAGE", "사진", "LINK", "링크",
            "DOCUMENT", "문서", "MEMO", "메모");

    private static final List<String> LOCATION_WORDS =
            List.of("집", "회사", "사무실", "카페", "학교", "여행");

    private static final Pattern MONTH = Pattern.compile("(\\d{1,2})\\s*월");

    Optional<ItemType> detectType(String q) {
        String lower = q.toLowerCase(Locale.ROOT);
        return TYPE_WORDS.entrySet().stream()
                .filter(e -> lower.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst();
    }

    Optional<PeriodMatch> detectPeriod(String q) {
        LocalDate today = LocalDate.now(zone);
        if (q.contains("오늘")) {
            return Optional.of(new PeriodMatch("기간: 오늘", today.toString(), today, today));
        }
        if (q.contains("어제")) {
            LocalDate y = today.minusDays(1);
            return Optional.of(new PeriodMatch("기간: 어제", y.toString(), y, y));
        }
        if (q.contains("지난주")) {
            LocalDate from = today.minusDays(7);
            return Optional.of(new PeriodMatch("기간: 지난주", from + "~" + today, from, today));
        }
        if (q.contains("이번달") || q.contains("이번 달")) {
            YearMonth ym = YearMonth.from(today);
            return Optional.of(monthPeriod(ym, "이번달"));
        }
        if (q.contains("지난달") || q.contains("저번달")) {
            YearMonth ym = YearMonth.from(today).minusMonths(1);
            return Optional.of(monthPeriod(ym, "지난달"));
        }
        Matcher m = MONTH.matcher(q);
        if (m.find()) {
            int month = Integer.parseInt(m.group(1));
            if (month >= 1 && month <= 12) {
                YearMonth ym = YearMonth.of(today.getYear(), month);
                return Optional.of(monthPeriod(ym, month + "월"));
            }
        }
        return Optional.empty();
    }

    private PeriodMatch monthPeriod(YearMonth ym, String label) {
        return new PeriodMatch("기간: " + label, ym.toString(),
                ym.atDay(1), ym.atEndOfMonth());
    }

    /** 유형/기간 신호어와 짧은 토큰을 제거한 내용 키워드(2자 이상). */
    List<String> extractKeywords(String q) {
        List<String> out = new ArrayList<>();
        for (String raw : q.split("\\s+")) {
            String token = raw.replaceAll("[\\p{Punct}]", "").trim();
            if (token.length() < 2) {
                continue;
            }
            String lower = token.toLowerCase(Locale.ROOT);
            if (TYPE_WORDS.containsKey(lower)) {
                continue;
            }
            if (isPeriodWord(token)) {
                continue;
            }
            if (!out.contains(lower)) {
                out.add(lower);
            }
        }
        return out;
    }

    private boolean isPeriodWord(String token) {
        return token.matches(".*(오늘|어제|지난주|이번달|지난달|저번달|\\d{1,2}월).*");
    }

    private List<SearchInterpretation> buildInterpretations(Optional<ItemType> type,
                                                            Optional<PeriodMatch> period,
                                                            List<String> keywords, String q) {
        List<SearchInterpretation> list = new ArrayList<>();
        period.ifPresent(p -> list.add(new SearchInterpretation("PERIOD", p.label(), p.value())));
        type.ifPresent(t -> list.add(new SearchInterpretation("ITEM_TYPE",
                "유형: " + TYPE_LABELS.getOrDefault(t.name(), t.name()), t.name())));
        for (String loc : LOCATION_WORDS) {
            if (q.contains(loc)) {
                list.add(new SearchInterpretation("LOCATION", "위치: " + loc, loc));
                break;
            }
        }
        for (String kw : keywords) {
            list.add(new SearchInterpretation("KEYWORD", "키워드: " + kw, kw));
        }
        return list;
    }

    private int countKeywordHits(Item item, List<String> keywords) {
        if (keywords.isEmpty()) {
            return 0;
        }
        StringBuilder haystack = new StringBuilder();
        append(haystack, item.getTitle());
        append(haystack, item.getCategory());
        append(haystack, item.getBody());
        append(haystack, item.getAiSummary());
        item.getTags().forEach(t -> append(haystack, t));
        String text = haystack.toString().toLowerCase(Locale.ROOT);
        int hits = 0;
        for (String kw : keywords) {
            if (text.contains(kw)) {
                hits++;
            }
        }
        return hits;
    }

    private void append(StringBuilder sb, String s) {
        if (s != null) {
            sb.append(' ').append(s);
        }
    }

    /** 0~100 일치도. 유형/기간 일치 보너스 + 키워드 적중 비례. */
    int score(int keywordHits, int totalKeywords, boolean typeMatched, boolean periodMatched) {
        int s = 50;
        if (typeMatched) {
            s += 20;
        }
        if (periodMatched) {
            s += 15;
        }
        if (totalKeywords > 0) {
            s += (int) Math.round(30.0 * keywordHits / totalKeywords);
        } else {
            s += 15; // 순수 유형/기간 질의: 기본 가점
        }
        return Math.min(s, 100);
    }

    private List<RefinedFilter> buildRefinedFilters(List<ScoredItem> scored, Boolean favoriteApplied) {
        List<RefinedFilter> filters = new ArrayList<>();
        // 결과 내 최다 카테고리로 좁히기
        String topCategory = scored.stream()
                .map(s -> s.item().getCategory())
                .filter(c -> c != null && !c.isBlank())
                .collect(java.util.stream.Collectors.groupingBy(c -> c, java.util.stream.Collectors.counting()))
                .entrySet().stream().max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(null);
        if (topCategory != null) {
            filters.add(new RefinedFilter("category-" + topCategory,
                    "'" + topCategory + "' 카테고리만 보기",
                    "이 검색 결과를 " + topCategory + " 카테고리로 좁힙니다.",
                    Map.of("category", topCategory)));
        }
        if (!Boolean.TRUE.equals(favoriteApplied)) {
            filters.add(new RefinedFilter("favorite-only", "즐겨찾기한 항목만 보기",
                    "즐겨찾기로 표시한 항목만 필터링합니다.", Map.of("favorite", true)));
        }
        return filters.size() > 2 ? filters.subList(0, 2) : filters;
    }

    private String buildAssistantHint(String mode, boolean empty, List<String> keywords) {
        String focus = keywords.isEmpty() ? "검색어" : "'" + keywords.get(0) + "'";
        if (empty) {
            return "이미지 내부의 텍스트도 검색할 수 있습니다. 스크린샷에서 " + focus + "를 찾아볼까요?";
        }
        if ("ASSISTANT".equals(mode)) {
            return "이미지 속 텍스트(OCR)까지 포함해 " + focus + " 관련 항목을 더 찾아볼 수 있습니다.";
        }
        return null;
    }

    private LocalDate localDate(Item item) {
        return item.getSavedAt().atZone(zone).toLocalDate();
    }

    // ── 내부 값 타입 ──────────────────────────────────────────
    record PeriodMatch(String label, String value, LocalDate from, LocalDate to) {
        boolean matches(LocalDate d) {
            return !d.isBefore(from) && !d.isAfter(to);
        }
    }

    private record ScoredItem(Item item, int score) {
    }
}
