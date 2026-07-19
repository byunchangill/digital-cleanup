package com.sortmate.cleanup.repository;

import com.sortmate.cleanup.entity.CleanupStat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CleanupStatRepository extends JpaRepository<CleanupStat, Long> {

    Optional<CleanupStat> findByUserId(Long userId);
}
