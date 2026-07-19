package com.sortmate.item.bootstrap;

import com.sortmate.auth.repository.UserRepository;
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
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 데모 사용자(demo@sortmate.app) 라이브러리에 샘플 Item을 시딩한다.
 * auth의 AuthDemoDataInitializer가 먼저 사용자를 만들어야 하므로 @Order(2).
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class ItemDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ItemDemoDataInitializer.class);
    private static final String DEMO_EMAIL = "demo@sortmate.app";

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;

    public ItemDemoDataInitializer(UserRepository userRepository, ItemRepository itemRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        var demo = userRepository.findByEmail(DEMO_EMAIL).orElse(null);
        if (demo == null || itemRepository.countByOwnerId(demo.getId()) > 0) {
            return;
        }
        Long owner = demo.getId();
        Instant now = Instant.now();

        List<Item> seeds = List.of(
                Item.builder().ownerId(owner).type(ItemType.SCREENSHOT).title("스타벅스 아메리카노 쿠폰")
                        .category("쿠폰").sourceApp("카카오톡").sourceType(SourceType.SCREENSHOT)
                        .thumbnailUrl("/media/demo/coupon/thumb").fileUrl("/media/demo/coupon/original")
                        .mimeType("image/png").fileSize(184_320L)
                        .aiClassified(true).aiSummary("스타벅스 아메리카노 무료 교환 쿠폰. 5월 만료 예정.")
                        .expiryDate(LocalDate.now().plusDays(12)).favorite(true)
                        .tags(List.of("쿠폰", "스타벅스", "음료", "선물"))
                        .savedAt(now.minus(2, ChronoUnit.HOURS)).build(),
                Item.builder().ownerId(owner).type(ItemType.SCREENSHOT).title("전자제품 영수증")
                        .category("영수증").sourceApp("갤러리").sourceType(SourceType.SCREENSHOT)
                        .thumbnailUrl("/media/demo/receipt/thumb").mimeType("image/jpeg").fileSize(512_000L)
                        .aiClassified(true).tags(List.of("영수증", "전자제품"))
                        .savedAt(now.minus(1, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.LINK).title("좋은 디자인 시스템 아티클")
                        .category("기사").sourceApp("medium.com").sourceType(SourceType.LINK)
                        .body("https://medium.com/design-systems").aiClassified(true)
                        .aiSummary("디자인 시스템 구축 사례 정리 글.")
                        .tags(List.of("디자인", "아티클")).favorite(true)
                        .savedAt(now.minus(3, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.DOCUMENT).title("프로젝트 제안서.pdf")
                        .category("디자인").mimeType("application/pdf").fileSize(2_516_582L)
                        .sourceType(SourceType.UPLOAD).thumbnailUrl("/media/demo/doc/thumb")
                        .tags(List.of("문서", "제안서")).favorite(true)
                        .savedAt(now.minus(5, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.IMAGE).title("여행 사진")
                        .category("사진").mimeType("image/jpeg").fileSize(3_200_000L)
                        .sourceType(SourceType.PHOTO).thumbnailUrl("/media/demo/photo/thumb")
                        .tags(List.of("여행"))
                        .savedAt(now.minus(7, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.MEMO).title("장보기 목록")
                        .body("- 우유\n- 계란\n- 빵").category("메모").sourceType(SourceType.MEMO)
                        .tags(List.of("초안"))
                        .savedAt(now.minus(10, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.MEMO).title("비밀 메모")
                        .body("이 내용은 잠겨 있습니다.").category("메모").sourceType(SourceType.MEMO)
                        .vaulted(true).thumbnailUrl("/media/demo/secret/thumb")
                        .aiSummary("민감 정보 포함").favorite(true)
                        .savedAt(now.minus(11, ChronoUnit.DAYS)).build(),
                Item.builder().ownerId(owner).type(ItemType.SCREENSHOT).title("만료 임박 기프티콘")
                        .category("쿠폰").sourceApp("카카오톡").sourceType(SourceType.SCREENSHOT)
                        .thumbnailUrl("/media/demo/gift/thumb").mimeType("image/png").fileSize(150_000L)
                        .aiClassified(true).expiryDate(LocalDate.now().plusDays(5))
                        .tags(List.of("쿠폰", "기프티콘"))
                        .savedAt(now.minus(14, ChronoUnit.DAYS)).build()
        );
        itemRepository.saveAll(seeds);
        log.info("[DEMO SEED] item {}건 시딩 완료 (owner={})", seeds.size(), owner);
    }
}
