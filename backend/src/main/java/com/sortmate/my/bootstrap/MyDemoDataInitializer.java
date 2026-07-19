package com.sortmate.my.bootstrap;

import com.sortmate.auth.repository.UserRepository;
import com.sortmate.my.entity.Notification;
import com.sortmate.my.entity.NotificationCategory;
import com.sortmate.my.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 데모 사용자(demo@sortmate.app)에게 알림 인박스 샘플을 시딩한다.
 * auth 시딩(@Order 1) 이후 실행. 플랜은 상수(무료 기본)이라 구독 시딩 불필요(FREE 간주),
 * 내보내기 잡은 화면에서 즉석 생성되므로 시딩하지 않는다.
 */
@Component
@Order(4)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class MyDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MyDemoDataInitializer.class);
    private static final String DEMO_EMAIL = "demo@sortmate.app";

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public MyDemoDataInitializer(UserRepository userRepository,
                                 NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        var demo = userRepository.findByEmail(DEMO_EMAIL).orElse(null);
        if (demo == null || notificationRepository.countByUserId(demo.getId()) > 0) {
            return;
        }
        Long owner = demo.getId();
        Instant now = Instant.now();

        List<Notification> seeds = List.of(
                Notification.builder().userId(owner).category(NotificationCategory.AI_ANALYSIS)
                        .type("AI_COMPLETE").title("5개 항목에 대한 AI 분석 완료")
                        .body("새로 추가된 항목이 자동으로 분류되었어요.")
                        .actionRoute("/library").actionLabel("라이브러리 보기")
                        .createdAt(now.minus(1, ChronoUnit.HOURS)).build(),
                Notification.builder().userId(owner).category(NotificationCategory.AI_ANALYSIS)
                        .type("DUPLICATE_FOUND").title("중복된 사진 2건을 발견했어요")
                        .body("비슷한 스크린샷이 묶여 있어요. 정리하면 공간을 아낄 수 있어요.")
                        .actionRoute("/cleanup/duplicates").actionLabel("중복 자료 검토")
                        .createdAt(now.minus(5, ChronoUnit.HOURS)).build(),
                Notification.builder().userId(owner).category(NotificationCategory.BENEFIT)
                        .type("COUPON_EXPIRING").title("곧 만료되는 쿠폰이 있어요")
                        .body("스타벅스 아메리카노 쿠폰이 12일 후 만료돼요.")
                        .actionRoute("/library?category=쿠폰").actionLabel("쿠폰 보기")
                        .createdAt(now.minus(1, ChronoUnit.DAYS)).build(),
                Notification.builder().userId(owner).category(NotificationCategory.SYSTEM)
                        .type("VAULT_BACKUP").title("시크릿 볼트 백업이 완료되었습니다")
                        .body("암호화된 백업이 안전하게 저장되었어요.")
                        .read(true)
                        .createdAt(now.minus(3, ChronoUnit.DAYS)).build()
        );
        notificationRepository.saveAll(seeds);
        log.info("[DEMO SEED] notification {}건 시딩 완료 (owner={})", seeds.size(), owner);
    }
}
