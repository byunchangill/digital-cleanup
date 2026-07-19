package com.sortmate.vault.repository;

import com.sortmate.vault.entity.VaultConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VaultConfigRepository extends JpaRepository<VaultConfig, Long> {
    Optional<VaultConfig> findByUserId(Long userId);
}
