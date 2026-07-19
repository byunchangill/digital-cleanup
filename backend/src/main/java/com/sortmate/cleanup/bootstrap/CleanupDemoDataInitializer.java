package com.sortmate.cleanup.bootstrap;

import com.sortmate.auth.repository.UserRepository;
import com.sortmate.cleanup.entity.CleanupGroup;
import com.sortmate.cleanup.entity.CleanupGroupStatus;
import com.sortmate.cleanup.entity.CleanupStat;
import com.sortmate.cleanup.entity.DuplicateCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidateStatus;
import com.sortmate.cleanup.entity.ScreenshotReason;
import com.sortmate.cleanup.repository.CleanupGroupRepository;
import com.sortmate.cleanup.repository.CleanupStatRepository;
import com.sortmate.cleanup.repository.ScreenshotCandidateRepository;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.entity.SourceType;
import com.sortmate.item.repository.ItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 데모 사용자에 cleanup 시연 데이터를 시딩한다(중복 그룹·스크린샷 후보·성과 통계).
 * item 시딩(@Order 2)이 만든 "카카오톡 대화 캡처" 3장을 중복 그룹으로 묶는다 → @Order(3).
 */
@Component
@Order(3)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class CleanupDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CleanupDemoDataInitializer.class);
    private static final String DEMO_EMAIL = "demo@sortmate.app";
    private static final long GB = 1024L * 1024 * 1024;

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final CleanupGroupRepository groupRepository;
    private final ScreenshotCandidateRepository screenshotRepository;
    private final CleanupStatRepository statRepository;

    public CleanupDemoDataInitializer(UserRepository userRepository, ItemRepository itemRepository,
                                      CleanupGroupRepository groupRepository,
                                      ScreenshotCandidateRepository screenshotRepository,
                                      CleanupStatRepository statRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.groupRepository = groupRepository;
        this.screenshotRepository = screenshotRepository;
        this.statRepository = statRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        var demo = userRepository.findByEmail(DEMO_EMAIL).orElse(null);
        if (demo == null || groupRepository.countByUserId(demo.getId()) > 0) {
            return;
        }
        Long owner = demo.getId();

        seedDuplicateGroup(owner);
        seedScreenshotCandidates(owner);
        seedStat(owner);

        log.info("[DEMO SEED] cleanup 시연 데이터 시딩 완료 (owner={})", owner);
    }

    /** item 시딩의 동일 제목 스크린샷 3장을 중복 그룹으로 묶는다. */
    private void seedDuplicateGroup(Long owner) {
        List<Item> kakao = itemRepository.findByOwnerId(owner).stream()
                .filter(i -> "카카오톡 대화 캡처".equals(i.getTitle()))
                .sorted(Comparator.comparing(Item::getFileSize, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
        if (kakao.size() < 2) {
            return;
        }
        long keptSize = kakao.get(0).getFileSize() == null ? 0 : kakao.get(0).getFileSize();
        long totalSize = kakao.stream().filter(i -> i.getFileSize() != null).mapToLong(Item::getFileSize).sum();

        CleanupGroup group = CleanupGroup.builder()
                .userId(owner)
                .summary(kakao.size() + "개의 유사한 스크린샷을 찾았습니다.")
                .estimatedSaveBytes(totalSize - keptSize)
                .status(CleanupGroupStatus.PENDING)
                .build();
        boolean first = true;
        for (Item item : kakao) {
            long size = item.getFileSize() == null ? 200_000L : item.getFileSize();
            group.addCandidate(DuplicateCandidate.builder()
                    .itemId(item.getId())
                    .width(2400)
                    .height(1080)
                    .fileSize(size)
                    .capturedAt(item.getSavedAt())
                    .recommendedKeep(first) // 최고 용량(=화질) 배지
                    .build());
            first = false;
        }
        groupRepository.save(group);
    }

    /** 불필요 스크린샷 후보: 전용 Item + 후보 행 시딩(사유 다양성). */
    private void seedScreenshotCandidates(Long owner) {
        Instant now = Instant.now();
        record Seed(String title, ScreenshotReason reason, String rec, boolean selected, long fileSize, int daysAgo) {
        }
        List<Seed> seeds = List.of(
                new Seed("탑승권 QR 코드", ScreenshotReason.ONE_TIME, "만료된 이벤트 또는 여행 티켓일 가능성이 큽니다.", true, 190_000L, 40),
                new Seed("일회성 인증번호", ScreenshotReason.ONE_TIME, "이미 사용된 인증번호일 수 있습니다.", true, 120_000L, 12),
                new Seed("주차 위치 캡처", ScreenshotReason.ONE_TIME, "지난 방문의 임시 메모로 보입니다.", true, 210_000L, 8),
                new Seed("영수증 캡처", ScreenshotReason.ONE_TIME, "보관 기한이 지난 영수증일 수 있습니다.", false, 175_000L, 30),
                new Seed("흐릿한 사진", ScreenshotReason.BLURRY, "초점이 맞지 않아 알아보기 어렵습니다.", true, 260_000L, 20),
                new Seed("설정 화면 캡처", ScreenshotReason.INFO, "설정 참고용 캡처로 보입니다.", false, 140_000L, 25),
                new Seed("공지 스크린샷", ScreenshotReason.INFO, "이미 확인이 끝난 공지일 수 있습니다.", false, 150_000L, 18)
        );

        List<ScreenshotCandidate> candidates = new ArrayList<>();
        for (Seed s : seeds) {
            Item item = itemRepository.save(Item.builder()
                    .ownerId(owner).type(ItemType.SCREENSHOT).title(s.title())
                    .category("스크린샷").sourceType(SourceType.SCREENSHOT)
                    .thumbnailUrl("/media/demo/cleanup/" + s.reason().name().toLowerCase() + "/thumb")
                    .mimeType("image/png").fileSize(s.fileSize())
                    .savedAt(now.minus(s.daysAgo(), ChronoUnit.DAYS))
                    .build());
            candidates.add(ScreenshotCandidate.builder()
                    .userId(owner).itemId(item.getId()).reason(s.reason())
                    .recommendationText(s.rec()).capturedAt(item.getSavedAt())
                    .defaultSelected(s.selected()).status(ScreenshotCandidateStatus.PENDING)
                    .build());
        }
        screenshotRepository.saveAll(candidates);
    }

    /** 리포트/설정 hero 성과 통계(화면 근거 수치). */
    private void seedStat(Long owner) {
        CleanupStat stat = CleanupStat.empty(owner);
        // 주간 5.4GB, 월간 1.2GB, 누적 12.8GB(+15%), 제거된 중복 2,481 (화면 근거)
        stat.seed(dec(5, 4) * GB / 10, dec(1, 2) * GB / 10, dec(12, 8) * GB / 10, 15, 2481);
        statRepository.save(stat);
    }

    /** 소수 한 자리(예: 5.4)를 정수 54로. */
    private long dec(int whole, int frac) {
        return whole * 10L + frac;
    }
}
