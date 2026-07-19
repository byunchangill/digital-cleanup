package com.sortmate.cleanup.repository;

import com.sortmate.cleanup.entity.CleanupSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CleanupSettingsRepository extends JpaRepository<CleanupSettings, Long> {

    Optional<CleanupSettings> findByUserId(Long userId);
}
