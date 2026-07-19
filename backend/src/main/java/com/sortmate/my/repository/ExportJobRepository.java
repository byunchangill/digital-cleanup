package com.sortmate.my.repository;

import com.sortmate.my.entity.ExportJob;
import com.sortmate.my.entity.ExportStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExportJobRepository extends JpaRepository<ExportJob, Long> {

    Optional<ExportJob> findByIdAndUserId(Long id, Long userId);

    /** 진행 중(비종료) 잡 조회 — EXPORT_ALREADY_RUNNING 판정용. */
    List<ExportJob> findByUserIdAndStatusNotIn(Long userId, java.util.Collection<ExportStatus> statuses);
}
