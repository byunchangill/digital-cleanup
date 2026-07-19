package com.sortmate.my.repository;

import com.sortmate.my.entity.Notification;
import com.sortmate.my.entity.NotificationCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserId(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndCategory(Long userId, NotificationCategory category, Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    List<Notification> findByUserIdAndReadFalse(Long userId);

    List<Notification> findByUserIdAndIdIn(Long userId, java.util.Collection<Long> ids);

    long countByUserId(Long userId);
}
