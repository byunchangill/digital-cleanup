package com.sortmate.vault.repository;

import com.sortmate.vault.entity.PrivacySettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PrivacySettingsRepository extends JpaRepository<PrivacySettings, Long> {
    Optional<PrivacySettings> findByUserId(Long userId);
}
