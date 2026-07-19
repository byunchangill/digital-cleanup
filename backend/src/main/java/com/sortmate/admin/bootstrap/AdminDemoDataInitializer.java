package com.sortmate.admin.bootstrap;

import com.sortmate.admin.entity.CsStatus;
import com.sortmate.admin.entity.CsTicket;
import com.sortmate.admin.entity.CsTicketType;
import com.sortmate.admin.entity.CsUrgency;
import com.sortmate.admin.repository.CsTicketRepository;
import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.Role;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.entity.UserPlan;
import com.sortmate.auth.entity.UserStatus;
import com.sortmate.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * admin 데모 시드: role=ADMIN 관리자 계정 + ADM-02 목록/ADM-04 티켓용 데모 데이터.
 * auth(@Order 1)·item(@Order 2) 이후 실행. app.seed-demo-data=false로 비활성화 가능.
 */
@Component
@Order(3)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class AdminDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminDemoDataInitializer.class);

    private static final String ADMIN_EMAIL = "admin@sortmate.app";
    private static final String ADMIN_PASSWORD = "GreenPine!Harbor42"; // auth 데모와 동일 데모 비밀번호

    private final UserRepository userRepository;
    private final CsTicketRepository csTicketRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDemoDataInitializer(UserRepository userRepository,
                                    CsTicketRepository csTicketRepository,
                                    PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.csTicketRepository = csTicketRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedAdmin();
        seedDemoMembers();
        seedCsTickets();
    }

    private void seedAdmin() {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) {
            return;
        }
        userRepository.save(User.builder()
                .email(ADMIN_EMAIL)
                .displayName("운영 관리자")
                .provider(AuthProvider.EMAIL)
                .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                .role(Role.ADMIN)
                .plan(UserPlan.PREMIUM)
                .status(UserStatus.ACTIVE)
                .build());
        log.info("[ADMIN SEED] email={} password={} role=ADMIN", ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    /** ADM-02 회원 목록이 비지 않도록 플랜/상태가 다양한 데모 회원 시딩. */
    private void seedDemoMembers() {
        String[][] rows = {
                {"김서연", "seoyeon.kim@example.com", "PREMIUM", "ACTIVE"},
                {"이준호", "junho.lee@example.com", "BASIC", "ACTIVE"},
                {"박지민", "jimin.park@example.com", "FREE", "PENDING"},
                {"최유진", "yujin.choi@example.com", "FREE", "DORMANT"},
                {"정도현", "dohyun.jung@example.com", "BASIC", "ACTIVE"},
                {"한소희", "sohee.han@example.com", "PREMIUM", "DORMANT"},
        };
        for (String[] r : rows) {
            if (userRepository.existsByEmail(r[1])) {
                continue;
            }
            userRepository.save(User.builder()
                    .email(r[1])
                    .displayName(r[0])
                    .provider(AuthProvider.EMAIL)
                    .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                    .plan(UserPlan.valueOf(r[2]))
                    .status(UserStatus.valueOf(r[3]))
                    .build());
        }
    }

    private void seedCsTickets() {
        if (csTicketRepository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        csTicketRepository.saveAll(List.of(
                CsTicket.builder().subject("결제 오류 신고").type(CsTicketType.PAYMENT_ERROR)
                        .urgency(CsUrgency.URGENT).status(CsStatus.OPEN)
                        .createdAt(now.minus(30, ChronoUnit.MINUTES)).build(),
                CsTicket.builder().subject("기능 제안: 폴더 공유").type(CsTicketType.FEATURE_REQUEST)
                        .urgency(CsUrgency.NORMAL).status(CsStatus.OPEN)
                        .createdAt(now.minus(3, ChronoUnit.HOURS)).build(),
                CsTicket.builder().subject("로그인 2단계 인증 문의").type(CsTicketType.GENERAL)
                        .urgency(CsUrgency.NORMAL).status(CsStatus.IN_PROGRESS)
                        .createdAt(now.minus(1, ChronoUnit.DAYS)).build(),
                CsTicket.builder().subject("프리미엄 환불 요청").type(CsTicketType.PAYMENT_ERROR)
                        .urgency(CsUrgency.URGENT).status(CsStatus.IN_PROGRESS)
                        .createdAt(now.minus(2, ChronoUnit.DAYS)).build(),
                CsTicket.builder().subject("사용법 안내 감사합니다").type(CsTicketType.GENERAL)
                        .urgency(CsUrgency.NORMAL).status(CsStatus.RESOLVED)
                        .createdAt(now.minus(5, ChronoUnit.DAYS)).build()));
    }
}
