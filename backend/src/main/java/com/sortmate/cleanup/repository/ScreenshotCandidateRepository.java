package com.sortmate.cleanup.repository;

import com.sortmate.cleanup.entity.ScreenshotCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidateStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScreenshotCandidateRepository extends JpaRepository<ScreenshotCandidate, Long> {

    List<ScreenshotCandidate> findByUserIdAndStatus(Long userId, ScreenshotCandidateStatus status);

    long countByUserId(Long userId);
}
