package com.sortmate.admin.service;

import com.sortmate.admin.dto.AdminDashboardResponse;
import com.sortmate.admin.dto.AdminDashboardResponse.RecentInquiry;
import com.sortmate.admin.dto.AdminDashboardResponse.RecentSubscriber;
import com.sortmate.admin.dto.ClassificationQualityResponse;
import com.sortmate.admin.dto.ClassificationQualityResponse.Cluster;
import com.sortmate.admin.dto.ClassificationQualityResponse.Suggestion;
import com.sortmate.admin.dto.ClassificationQualityResponse.TrendPoint;
import com.sortmate.admin.dto.CsTicketDto;
import com.sortmate.admin.dto.MemberDto;
import com.sortmate.admin.dto.ValidationPackResponse;
import com.sortmate.admin.entity.CsStatus;
import com.sortmate.admin.entity.CsUrgency;
import com.sortmate.admin.repository.CsTicketRepository;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.entity.UserPlan;
import com.sortmate.auth.entity.UserStatus;
import com.sortmate.auth.repository.UserRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.PageResponse;
import com.sortmate.item.repository.ItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * ADM-01~06 전역 집계/목록/데모 지표. 소유자 필터 없이 users/items 전체 스캔.
 * AI/CS/uptime 실측 인프라 없음 → aiClassified 비율만 실집계, 나머지는 데모 상수(계약 [가정]).
 */
@Service
@Transactional(readOnly = true)
public class AdminService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // ── 데모 상수(실측 인프라 없음, 계약 [가정]) ────────────────
    private static final double DEMO_USERS_DELTA_PERCENT = 12.5;
    private static final double DEMO_AI_SUCCESS_RATE = 99.4;
    private static final int DEMO_AI_AVG_RESPONSE_MS = 1200;
    private static final String DEMO_AI_STATUS = "STABLE";
    private static final int DEMO_ACTIVE_SESSIONS = 128;
    private static final String DEMO_SERVER_STATUS = "NORMAL";
    private static final double DEMO_UPTIME_PERCENT = 99.98;
    private static final double DEMO_ACCURACY = 94.2;
    private static final double DEMO_ACCURACY_DELTA = 2.4;

    /** ADM-03 CSV 전체 내보내기 행수 상한. ponytail: 단순 상한, 대용량이면 스트리밍으로 승급. */
    private static final int EXPORT_MAX_ROWS = 100_000;

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final CsTicketRepository csTicketRepository;

    public AdminService(UserRepository userRepository, ItemRepository itemRepository,
                        CsTicketRepository csTicketRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.csTicketRepository = csTicketRepository;
    }

    // ── ADM-01 대시보드 ────────────────────────────────────────
    public AdminDashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        Instant startOfTodayKst = LocalDate.now(KST).atStartOfDay(KST).toInstant();
        long savedToday = itemRepository.countBySavedAtGreaterThanEqual(startOfTodayKst);
        long totalItems = itemRepository.count();
        double aiSuccessRate = aiSuccessRateApprox(totalItems);
        long unresolvedCs = csTicketRepository.countByStatusNot(CsStatus.RESOLVED);
        long urgentCs = csTicketRepository.countByStatusNotAndUrgency(CsStatus.RESOLVED, CsUrgency.URGENT);

        List<RecentSubscriber> recentSubscribers = userRepository.findTop4ByOrderByCreatedAtDesc().stream()
                .map(u -> new RecentSubscriber(u.getId(), u.getDisplayName(), u.getEmail(),
                        u.getPlan().name(), u.getStatus().name(), u.getCreatedAt()))
                .toList();

        List<RecentInquiry> recentInquiries = csTicketRepository
                .findByStatusNotOrderByCreatedAtDesc(CsStatus.RESOLVED, PageRequest.of(0, 2)).stream()
                .map(t -> new RecentInquiry(t.getId(), t.getSubject(), t.getType().name(), t.getUrgency().name()))
                .toList();

        return new AdminDashboardResponse(
                totalUsers, DEMO_USERS_DELTA_PERCENT, savedToday, totalItems,
                aiSuccessRate, DEMO_AI_AVG_RESPONSE_MS, DEMO_AI_STATUS, DEMO_ACTIVE_SESSIONS,
                unresolvedCs, urgentCs, DEMO_SERVER_STATUS, DEMO_UPTIME_PERCENT,
                recentSubscribers, recentInquiries);
    }

    // ── ADM-02 회원 목록 ───────────────────────────────────────
    public PageResponse<MemberDto> getMembers(String q, String status, String plan, Pageable pageable) {
        Page<User> page = userRepository.searchMembers(
                blankToNull(q), parseStatus(status), parsePlan(plan), pageable);
        return PageResponse.of(page, this::toMemberDto);
    }

    // ── ADM-03 CSV 내보내기 ────────────────────────────────────
    public String exportMembersCsv(String q, String status, String plan) {
        Pageable all = PageRequest.of(0, EXPORT_MAX_ROWS, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<User> users = userRepository.searchMembers(
                blankToNull(q), parseStatus(status), parsePlan(plan), all).getContent();
        StringBuilder sb = new StringBuilder(
                "id,displayName,email,joinedAt,storageUsedBytes,storageQuotaBytes,storagePercent,plan,status\n");
        for (User u : users) {
            MemberDto m = toMemberDto(u);
            sb.append(m.id()).append(',')
                    .append(csv(m.displayName())).append(',')
                    .append(csv(m.email())).append(',')
                    .append(m.joinedAt()).append(',')
                    .append(m.storageUsedBytes()).append(',')
                    .append(m.storageQuotaBytes()).append(',')
                    .append(m.storagePercent()).append(',')
                    .append(m.plan()).append(',')
                    .append(m.status()).append('\n');
        }
        return sb.toString();
    }

    // ── ADM-04 CS 티켓 목록 ────────────────────────────────────
    public PageResponse<CsTicketDto> getCsTickets(String status, String urgency, Pageable pageable) {
        Page<com.sortmate.admin.entity.CsTicket> page = csTicketRepository.search(
                parseCsStatus(status), parseUrgency(urgency), pageable);
        return PageResponse.of(page, CsTicketDto::of);
    }

    // ── ADM-05 분류 품질 ───────────────────────────────────────
    public ClassificationQualityResponse getClassificationQuality(String range) {
        int days = parseRangeDays(range);
        double avg = aiClassifiedAccuracyApprox();
        List<TrendPoint> trend = buildDemoTrend(days, avg);
        List<Cluster> clusters = List.of(
                new Cluster("Shopping", "Receipts", "HIGH", 42, 1200),
                new Cluster("Travel", "Documents", "MEDIUM", 27, 640),
                new Cluster("Social", "Screenshots", "LOW", 11, 305));
        Suggestion suggestion = new Suggestion(
                "Increase sampling rate for OCR-heavy documents.",
                "영수증·쇼핑 카테고리 간 오분류가 잦습니다. OCR 텍스트 밀도가 높은 문서의 샘플링 비율을 높여 재검증을 권장합니다.");
        return new ClassificationQualityResponse(avg, DEMO_ACCURACY_DELTA, trend, clusters, suggestion);
    }

    // ── ADM-06 Validation Pack stub ────────────────────────────
    public ValidationPackResponse runValidationPack() {
        return new ValidationPackResponse("vp_" + UUID.randomUUID(), "QUEUED",
                "검증 팩 실행이 접수되었습니다.");
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────
    private MemberDto toMemberDto(User user) {
        long used = itemRepository.sumFileSizeByOwnerId(user.getId());
        return MemberDto.of(user, used);
    }

    /** aiClassified=true 비율(%) 근사, 아이템 없으면 데모 상수. */
    private double aiSuccessRateApprox(long totalItems) {
        if (totalItems <= 0) {
            return DEMO_AI_SUCCESS_RATE;
        }
        long ok = itemRepository.countByAiClassifiedTrue();
        return Math.round((double) ok / totalItems * 1000.0) / 10.0;
    }

    private double aiClassifiedAccuracyApprox() {
        long total = itemRepository.count();
        if (total <= 0) {
            return DEMO_ACCURACY;
        }
        long ok = itemRepository.countByAiClassifiedTrue();
        return Math.round((double) ok / total * 1000.0) / 10.0;
    }

    /** 데모 시계열: 오늘 기준 과거 days일, avg 주변 진동(재현 가능). */
    private List<TrendPoint> buildDemoTrend(int days, double avg) {
        LocalDate today = LocalDate.now(KST);
        return java.util.stream.IntStream.range(0, days)
                .mapToObj(i -> {
                    LocalDate d = today.minusDays(days - 1L - i);
                    double wobble = Math.sin(i / 3.0) * 1.5; // ±1.5%p
                    double acc = Math.round((avg + wobble) * 10.0) / 10.0;
                    return new TrendPoint(d.toString(), acc);
                })
                .toList();
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static int parseRangeDays(String range) {
        if (range == null || range.isBlank() || "30D".equalsIgnoreCase(range)) {
            return 30;
        }
        if ("90D".equalsIgnoreCase(range)) {
            return 90;
        }
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "range는 30D 또는 90D여야 합니다.");
    }

    private static UserStatus parseStatus(String v) {
        return parseEnum(v, UserStatus.class, "status");
    }

    private static UserPlan parsePlan(String v) {
        return parseEnum(v, UserPlan.class, "plan");
    }

    private static CsStatus parseCsStatus(String v) {
        return parseEnum(v, CsStatus.class, "status");
    }

    private static CsUrgency parseUrgency(String v) {
        return parseEnum(v, CsUrgency.class, "urgency");
    }

    private static <E extends Enum<E>> E parseEnum(String v, Class<E> type, String field) {
        if (v == null || v.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 " + field + " 값입니다: " + v);
        }
    }

    /** CSV 필드 이스케이프(쉼표/따옴표/개행 포함 시 큰따옴표 감싸기). */
    private static String csv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
