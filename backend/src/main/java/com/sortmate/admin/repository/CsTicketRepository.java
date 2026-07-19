package com.sortmate.admin.repository;

import com.sortmate.admin.entity.CsStatus;
import com.sortmate.admin.entity.CsTicket;
import com.sortmate.admin.entity.CsUrgency;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CsTicketRepository extends JpaRepository<CsTicket, Long> {

    /** ADM-01 미처리 CS 수. */
    long countByStatusNot(CsStatus status);

    /** ADM-01 미처리 중 긴급 건수. */
    long countByStatusNotAndUrgency(CsStatus status, CsUrgency urgency);

    /** ADM-01 미처리 요약(상위 N, 최신순). */
    List<CsTicket> findByStatusNotOrderByCreatedAtDesc(CsStatus status, Pageable pageable);

    /** ADM-04 필터/페이지. status/urgency는 null이면 무시. */
    @Query("select t from CsTicket t where "
            + "(:status is null or t.status = :status) "
            + "and (:urgency is null or t.urgency = :urgency)")
    Page<CsTicket> search(@Param("status") CsStatus status,
                          @Param("urgency") CsUrgency urgency,
                          Pageable pageable);
}
