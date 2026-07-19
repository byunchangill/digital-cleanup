package com.sortmate.item.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * 라이브러리 핵심 데이터 단위. 계약 "Item 표준 표현"의 원천.
 * tags는 조인 테이블 대신 @ElementCollection으로 역정규화(계약이 tags: string[]만 노출).
 */
@Entity
@Table(name = "items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 소유자 User.id (사용자별 데이터 격리) */
    @Column(nullable = false)
    private Long ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ItemType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String body;

    @Column
    private String category;

    @Column
    private String thumbnailUrl;

    @Column
    private String fileUrl;

    @Column
    private Long fileSize;

    @Column
    private String mimeType;

    @Column
    private String sourceApp;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private SourceType sourceType;

    @Column(columnDefinition = "text")
    private String aiSummary;

    @Column(nullable = false)
    private boolean aiClassified;

    @Column
    private LocalDate expiryDate;

    @Column(nullable = false)
    private boolean favorite;

    @Column(nullable = false)
    private boolean vaulted;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "item_tags", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "tag", length = 30)
    private List<String> tags = new ArrayList<>();

    @Column(nullable = false)
    private Instant savedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Builder
    public Item(Long ownerId, ItemType type, String title, String body, String category,
                String thumbnailUrl, String fileUrl, Long fileSize, String mimeType,
                String sourceApp, SourceType sourceType, String aiSummary, boolean aiClassified,
                LocalDate expiryDate, boolean favorite, boolean vaulted, List<String> tags,
                Instant savedAt) {
        this.ownerId = ownerId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.category = category;
        this.thumbnailUrl = thumbnailUrl;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.mimeType = mimeType;
        this.sourceApp = sourceApp;
        this.sourceType = sourceType;
        this.aiSummary = aiSummary;
        this.aiClassified = aiClassified;
        this.expiryDate = expiryDate;
        this.favorite = favorite;
        this.vaulted = vaulted;
        if (tags != null) {
            this.tags = new ArrayList<>(tags);
        }
        this.savedAt = savedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.savedAt == null) {
            this.savedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** 만료 임박: expiryDate가 오늘부터 30일 이내(과거 포함). */
    public boolean isExpiringSoon() {
        if (expiryDate == null) {
            return false;
        }
        return !expiryDate.isAfter(LocalDate.now().plusDays(30));
    }

    // ── 상태 변경 ──────────────────────────────────────────────
    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateBody(String body) {
        this.body = body;
    }

    public void updateCategory(String category) {
        this.category = category;
    }

    public void updateThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public void replaceTags(List<String> tags) {
        this.tags = tags == null ? new ArrayList<>() : new ArrayList<>(tags);
    }

    /** 기존 태그 유지하며 append(중복 제거, 순서 보존). */
    public void addTags(List<String> extra) {
        if (extra == null || extra.isEmpty()) {
            return;
        }
        LinkedHashSet<String> merged = new LinkedHashSet<>(this.tags);
        merged.addAll(extra);
        this.tags = new ArrayList<>(merged);
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }

    public void setVaulted(boolean vaulted) {
        this.vaulted = vaulted;
    }
}
