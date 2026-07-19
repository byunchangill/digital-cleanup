package com.sortmate.vault.bootstrap;

import com.sortmate.auth.repository.UserRepository;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.entity.SourceType;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.vault.entity.PrivacySettings;
import com.sortmate.vault.entity.VaultConfig;
import com.sortmate.vault.repository.PrivacySettingsRepository;
import com.sortmate.vault.repository.VaultConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * 데모 사용자(demo@sortmate.app)에게 볼트 PIN·프라이버시 기본값을 시딩한다.
 * auth(@Order 1)·item(@Order 2) 시딩 뒤에 실행되어야 하므로 @Order(3).
 */
@Component
@Order(3)
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true", matchIfMissing = true)
public class VaultDemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(VaultDemoDataInitializer.class);
    private static final String DEMO_EMAIL = "demo@sortmate.app";
    private static final String DEMO_PIN = "123456";

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final VaultConfigRepository vaultConfigRepository;
    private final PrivacySettingsRepository privacySettingsRepository;
    private final PasswordEncoder passwordEncoder;

    public VaultDemoDataInitializer(UserRepository userRepository,
                                    ItemRepository itemRepository,
                                    VaultConfigRepository vaultConfigRepository,
                                    PrivacySettingsRepository privacySettingsRepository,
                                    PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.vaultConfigRepository = vaultConfigRepository;
        this.privacySettingsRepository = privacySettingsRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        var demo = userRepository.findByEmail(DEMO_EMAIL).orElse(null);
        if (demo == null) {
            return;
        }
        Long owner = demo.getId();

        if (vaultConfigRepository.findByUserId(owner).isEmpty()) {
            VaultConfig config = new VaultConfig(owner);
            config.setPin(passwordEncoder.encode(DEMO_PIN));
            vaultConfigRepository.save(config);
            log.info("[DEMO SEED] vault PIN={} (user={})", DEMO_PIN, owner);
        }

        if (privacySettingsRepository.findByUserId(owner).isEmpty()) {
            privacySettingsRepository.save(new PrivacySettings(owner));
        }

        // vaulted 아이템 보강: item 시딩이 비활성/부재로 하나도 없을 때만 대표 아이템 1건 추가.
        boolean hasVaulted = itemRepository.findByOwnerId(owner).stream().anyMatch(Item::isVaulted);
        if (!hasVaulted) {
            Instant now = Instant.now();
            itemRepository.save(Item.builder().ownerId(owner).type(ItemType.IMAGE)
                    .title("신분증 스캔").category("신분증").sourceApp("스캐너 앱")
                    .sourceType(SourceType.UPLOAD).mimeType("image/jpeg").fileSize(1_048_576L)
                    .thumbnailUrl("/media/demo/id/thumb").fileUrl("/media/demo/id/original")
                    .aiSummary("높은 중요도의 신분 확인 증명서.").vaulted(true).favorite(true)
                    .tags(java.util.List.of("금융", "신분증"))
                    .expiryDate(LocalDate.now().plusDays(90))
                    .savedAt(now.minus(1, ChronoUnit.DAYS)).build());
            log.info("[DEMO SEED] vaulted 아이템 1건 보강 (user={})", owner);
        }
    }
}
