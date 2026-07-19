package com.sortmate.my.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.my.dto.NotificationDtos.NotificationDto;
import com.sortmate.my.dto.NotificationDtos.NotificationListResponse;
import com.sortmate.my.dto.NotificationDtos.ReadRequest;
import com.sortmate.my.dto.NotificationDtos.ReadResponse;
import com.sortmate.my.entity.Notification;
import com.sortmate.my.entity.NotificationCategory;
import com.sortmate.my.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** MY-01/02 알림 인박스 서비스. */
@Service
public class NotificationService {

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public NotificationListResponse list(Long userId, String categoryRaw, Pageable pageable) {
        NotificationCategory category = parseCategory(categoryRaw);
        Page<Notification> page = category == null
                ? repository.findByUserId(userId, pageable)
                : repository.findByUserIdAndCategory(userId, category, pageable);
        List<NotificationDto> dtos = page.getContent().stream().map(NotificationDto::of).toList();
        return new NotificationListResponse(dtos, repository.countByUserIdAndReadFalse(userId),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.hasNext());
    }

    @Transactional
    public ReadResponse markRead(Long userId, ReadRequest req) {
        if (req == null || req.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "ids 또는 all 중 하나는 필요합니다.");
        }
        int updated;
        if (req.markAll()) {
            // ids와 all 동시 전달 시 all 우선(계약 비고).
            List<Notification> unread = repository.findByUserIdAndReadFalse(userId);
            unread.forEach(Notification::markRead);
            updated = unread.size();
        } else {
            List<Notification> found = repository.findByUserIdAndIdIn(userId, req.ids());
            if (found.size() != req.ids().stream().distinct().count()) {
                throw new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND);
            }
            updated = 0;
            for (Notification n : found) {
                if (!n.isRead()) {
                    n.markRead();
                    updated++;
                }
            }
        }
        return new ReadResponse(updated, repository.countByUserIdAndReadFalse(userId));
    }

    private NotificationCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return NotificationCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "category는 AI_ANALYSIS|SYSTEM|BENEFIT만 허용됩니다.");
        }
    }
}
