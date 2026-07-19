package com.sortmate.cleanup.repository;

import com.sortmate.cleanup.entity.CleanupGroup;
import com.sortmate.cleanup.entity.CleanupGroupStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CleanupGroupRepository extends JpaRepository<CleanupGroup, Long> {

    Optional<CleanupGroup> findByIdAndUserId(Long id, Long userId);

    Page<CleanupGroup> findByUserIdAndStatus(Long userId, CleanupGroupStatus status, Pageable pageable);

    List<CleanupGroup> findByUserIdAndStatus(Long userId, CleanupGroupStatus status);

    long countByUserId(Long userId);
}
