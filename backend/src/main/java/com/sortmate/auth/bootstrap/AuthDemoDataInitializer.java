package com.sortmate.auth.bootstrap;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.RecoveryCode;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.repository.RecoveryCodeRepository;
import com.sortmate.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * [자율결정] auth 계약에는 회원가입 엔드포인트가 없어 이메일 로그인/복구 코드를
 * 수동 검증할 수 있도록 데모 계정을 시딩한다. app.seed-demo-data=false로 비활성화 가능.
 */
@Component
@org.springframework.core.annotation.Order(1) // item 시딩(@Order 2)보다 먼저 사용자 생성
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class AuthDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AuthDemoDataInitializer.class);

    private static final String DEMO_EMAIL = "demo@sortmate.app";
    private static final String DEMO_PASSWORD = "GreenPine!Harbor42";
    private static final String DEMO_RECOVERY_CODE = "ABCD1234EFGH5678IJKL9012"; // 24자 영숫자

    private final UserRepository userRepository;
    private final RecoveryCodeRepository recoveryCodeRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthDemoDataInitializer(UserRepository userRepository,
                                   RecoveryCodeRepository recoveryCodeRepository,
                                   PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.recoveryCodeRepository = recoveryCodeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        if (userRepository.existsByEmail(DEMO_EMAIL)) {
            return;
        }
        User demo = userRepository.save(User.builder()
                .email(DEMO_EMAIL)
                .displayName("데모 사용자")
                .provider(AuthProvider.EMAIL)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .build());

        recoveryCodeRepository.save(RecoveryCode.builder()
                .userId(demo.getId())
                .codeHash(passwordEncoder.encode(DEMO_RECOVERY_CODE))
                .build());

        log.info("[DEMO SEED] email={} password={} recoveryCode={}",
                DEMO_EMAIL, DEMO_PASSWORD, DEMO_RECOVERY_CODE);
    }
}
