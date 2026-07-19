package com.sortmate.admin.dto;

import com.sortmate.admin.entity.CsTicket;

import java.time.Instant;

/** ADM-04 CS 티켓 행. */
public record CsTicketDto(
        Long id,
        String subject,
        String type,
        String urgency,
        String status,
        Instant createdAt
) {
    public static CsTicketDto of(CsTicket t) {
        return new CsTicketDto(
                t.getId(),
                t.getSubject(),
                t.getType().name(),
                t.getUrgency().name(),
                t.getStatus().name(),
                t.getCreatedAt()
        );
    }
}
