package com.sortmate.item.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.CategoryListResponse;
import com.sortmate.item.dto.ImportResponse;
import com.sortmate.item.dto.ItemDetailDto;
import com.sortmate.item.dto.ItemDto;
import com.sortmate.item.dto.ItemUpdateRequest;
import com.sortmate.item.dto.MemoCreateRequest;
import com.sortmate.item.dto.PageResponse;
import com.sortmate.item.dto.RelatedItemsResponse;
import com.sortmate.item.dto.ToggleResponses.BulkUpdateResponse;
import com.sortmate.item.dto.ToggleResponses.DeleteResponse;
import com.sortmate.item.dto.ToggleResponses.FavoriteResponse;
import com.sortmate.item.dto.ToggleResponses.ShareResponse;
import com.sortmate.item.dto.ToggleResponses.VaultResponse;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.entity.SourceType;
import com.sortmate.item.repository.ItemRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ItemService {

    /** ITEM-01 파일 상한(가정 20MB). */
    static final long MAX_FILE_BYTES = 20L * 1024 * 1024;

    private final ItemRepository itemRepository;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    // ── ITEM-01 갤러리 가져오기 ────────────────────────────────
    @Transactional
    public ImportResponse importItems(Long ownerId, List<MultipartFile> files, String sourceTypeRaw) {
        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "가져올 파일이 없습니다.");
        }
        SourceType sourceType = parseImportSource(sourceTypeRaw);
        ItemType type = sourceType == SourceType.SCREENSHOT ? ItemType.SCREENSHOT : ItemType.IMAGE;

        List<Item> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            if (file.getSize() > MAX_FILE_BYTES) {
                throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
            }
            String mime = file.getContentType();
            if (mime == null || !mime.startsWith("image/")) {
                throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
            }
            String token = UUID.randomUUID().toString();
            Item item = Item.builder()
                    .ownerId(ownerId)
                    .type(type)
                    .title(originalName(file))
                    .fileSize(file.getSize())
                    .mimeType(mime)
                    .sourceType(sourceType)
                    // 바이너리 저장 인프라 미연동 → 플레이스홀더 URL. [가정]
                    .thumbnailUrl("/media/" + token + "/thumb")
                    .fileUrl("/media/" + token + "/original")
                    .savedAt(Instant.now())
                    .build();
            saved.add(itemRepository.save(item));
        }
        return new ImportResponse(saved.size(), saved.stream().map(ImportResponse.ImportedItem::of).toList());
    }

    // ── ITEM-02 메모 생성 ──────────────────────────────────────
    @Transactional
    public ItemDetailDto createMemo(Long ownerId, MemoCreateRequest req) {
        String title = (req.title() == null || req.title().isBlank()) ? "제목 없음" : req.title();
        Item item = Item.builder()
                .ownerId(ownerId)
                .type(ItemType.MEMO)
                .title(title)
                .body(req.body())
                .category(req.category())
                .tags(req.tags())
                .sourceType(SourceType.MEMO)
                .vaulted(Boolean.TRUE.equals(req.vaulted()))
                .savedAt(Instant.now())
                .build();
        // attachmentIds는 미디어 참조 힌트일 뿐 본 계약은 연결 스키마를 정의하지 않음 → 무시. [가정]
        return ItemDetailDto.of(itemRepository.save(item));
    }

    // ── ITEM-03 목록 조회 ──────────────────────────────────────
    @Transactional(readOnly = true)
    public PageResponse<ItemDto> list(Long ownerId, String type, String category, Boolean favorite,
                                      Boolean vaulted, String q, Pageable pageable) {
        ItemType itemType = parseType(type);
        boolean vaultedFilter = Boolean.TRUE.equals(vaulted); // 기본 false: vault 제외
        Page<Item> page = itemRepository.findAll(
                filter(ownerId, itemType, category, favorite, vaultedFilter, q), pageable);
        return PageResponse.of(page, ItemDto::of);
    }

    // ── ITEM-07 즐겨찾기 목록 ──────────────────────────────────
    @Transactional(readOnly = true)
    public PageResponse<ItemDto> favorites(Long ownerId, String type, String q, Pageable pageable) {
        ItemType itemType = parseType(type);
        // 즐겨찾기는 vault 여부와 무관하게 favorite=true 전부 포함(계약 ITEM-07 비고).
        Page<Item> page = itemRepository.findAll(
                filter(ownerId, itemType, null, true, null, q), pageable);
        return PageResponse.of(page, ItemDto::of);
    }

    // ── ITEM-04 상세 ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public ItemDetailDto getDetail(Long ownerId, Long id) {
        return ItemDetailDto.of(getOwned(ownerId, id));
    }

    // ── ITEM-05 관련 아이템 ────────────────────────────────────
    @Transactional(readOnly = true)
    public RelatedItemsResponse related(Long ownerId, Long id, int limit) {
        Item item = getOwned(ownerId, id);
        int capped = Math.min(Math.max(limit, 1), 20);
        List<Item> related = item.getCategory() == null ? List.of()
                : itemRepository.findByOwnerIdAndCategoryAndIdNotOrderBySavedAtDesc(
                ownerId, item.getCategory(), id, PageRequest.of(0, capped));
        return new RelatedItemsResponse(related.stream().map(RelatedItemsResponse.RelatedItem::of).toList());
    }

    // ── ITEM-06 수정 ───────────────────────────────────────────
    @Transactional
    public ItemDetailDto update(Long ownerId, Long id, ItemUpdateRequest req) {
        if (req.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "수정할 필드가 최소 1개 필요합니다.");
        }
        Item item = getOwned(ownerId, id);
        if (req.title() != null) {
            item.updateTitle(req.title());
        }
        if (req.body() != null) {
            item.updateBody(req.body());
        }
        if (req.category() != null) {
            item.updateCategory(req.category());
        }
        if (req.tags() != null) {
            item.replaceTags(req.tags());
        }
        if (req.thumbnailFileId() != null) {
            // 사전 업로드(ITEM-01)한 미디어 Item의 썸네일로 교체. 소유·존재 검증.
            Item media = itemRepository.findByIdAndOwnerId(req.thumbnailFileId(), ownerId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "thumbnailFileId가 유효하지 않습니다: " + req.thumbnailFileId()));
            item.updateThumbnailUrl(media.getThumbnailUrl());
        }
        // aiSummary는 편집 불가(계약 ITEM-06 비고) → 요청에 없으며 무시.
        return ItemDetailDto.of(item);
    }

    // ── ITEM-15 AI 재분석 요청(stub) ───────────────────────────
    @Transactional(readOnly = true)
    public com.sortmate.item.dto.ToggleResponses.ReanalyzeResponse reanalyze(Long ownerId, Long id) {
        Item item = getOwned(ownerId, id); // 404/403
        // AI 미연동 → 접수만 확인하는 no-op. 실제 큐잉/비동기 갱신은 AI 연동 후. [가정]
        return new com.sortmate.item.dto.ToggleResponses.ReanalyzeResponse(
                item.getId(), "QUEUED", "AI 재분석 요청이 접수되었습니다.");
    }

    // ── ITEM-08 즐겨찾기 토글 ──────────────────────────────────
    @Transactional
    public FavoriteResponse toggleFavorite(Long ownerId, Long id, boolean favorite) {
        Item item = getOwned(ownerId, id);
        item.setFavorite(favorite);
        return new FavoriteResponse(item.getId(), item.isFavorite());
    }

    // ── ITEM-12 vault 토글 ─────────────────────────────────────
    @Transactional
    public VaultResponse toggleVault(Long ownerId, Long id, boolean vaulted) {
        Item item = getOwned(ownerId, id);
        item.setVaulted(vaulted);
        return new VaultResponse(item.getId(), item.isVaulted());
    }

    // ── ITEM-09 삭제(단건/일괄) ────────────────────────────────
    @Transactional
    public DeleteResponse delete(Long ownerId, List<Long> ids) {
        List<Long> failed = new ArrayList<>();
        int deleted = 0;
        for (Long id : ids) {
            Optional<Item> owned = itemRepository.findByIdAndOwnerId(id, ownerId);
            if (owned.isEmpty()) {
                failed.add(id);
                continue;
            }
            itemRepository.delete(owned.get());
            deleted++;
        }
        return new DeleteResponse(deleted, failed);
    }

    // ── ITEM-10 일괄 카테고리 이동 ─────────────────────────────
    @Transactional
    public BulkUpdateResponse bulkCategory(Long ownerId, List<Long> ids, String category) {
        List<Long> failed = new ArrayList<>();
        int updated = 0;
        for (Long id : ids) {
            Optional<Item> owned = itemRepository.findByIdAndOwnerId(id, ownerId);
            if (owned.isEmpty()) {
                failed.add(id);
                continue;
            }
            owned.get().updateCategory(category);
            updated++;
        }
        return new BulkUpdateResponse(updated, failed);
    }

    // ── ITEM-11 일괄 태그 추가 ─────────────────────────────────
    @Transactional
    public BulkUpdateResponse bulkTags(Long ownerId, List<Long> ids, List<String> tags) {
        List<Long> failed = new ArrayList<>();
        int updated = 0;
        for (Long id : ids) {
            Optional<Item> owned = itemRepository.findByIdAndOwnerId(id, ownerId);
            if (owned.isEmpty()) {
                failed.add(id);
                continue;
            }
            owned.get().addTags(tags);
            updated++;
        }
        return new BulkUpdateResponse(updated, failed);
    }

    // ── ITEM-13 공유 ───────────────────────────────────────────
    // vaultUnlocked: 유효한 X-Vault-Token(볼트 세션)이 동봉됐는지. 컨트롤러가 VaultTokenService로 판정해 전달.
    @Transactional(readOnly = true)
    public ShareResponse share(Long ownerId, List<Long> ids, boolean vaultUnlocked) {
        for (Long id : ids) {
            Item item = getOwned(ownerId, id);
            // vaulted는 볼트 세션 활성 시에만 조건부 공유 허용(계약 ITEM-13/VAULT-04). 세션 없으면 403.
            if (item.isVaulted() && !vaultUnlocked) {
                throw new BusinessException(ErrorCode.VAULT_LOCKED);
            }
        }
        // 공유 링크 발급: 토큰 URL + 7일 만료. 실제 링크 해석은 후속 인프라. [가정]
        String token = UUID.randomUUID().toString().replace("-", "");
        return new ShareResponse("https://sortmate.app/s/" + token,
                Instant.now().plus(7, ChronoUnit.DAYS));
    }

    // ── ITEM-14 카테고리 목록 ──────────────────────────────────
    @Transactional(readOnly = true)
    public CategoryListResponse categories(Long ownerId) {
        List<CategoryListResponse.CategoryCount> categories = itemRepository.aggregateCategories(ownerId).stream()
                .map(c -> new CategoryListResponse.CategoryCount(c.getName(), c.getCnt()))
                .toList();
        return new CategoryListResponse(categories);
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────

    /** 소유권 검사: 없으면 404, 타인 소유면 403. */
    Item getOwned(Long ownerId, Long id) {
        return itemRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> itemRepository.existsById(id)
                        ? new BusinessException(ErrorCode.ITEM_FORBIDDEN)
                        : new BusinessException(ErrorCode.ITEM_NOT_FOUND));
    }

    private Specification<Item> filter(Long ownerId, ItemType type, String category,
                                       Boolean favorite, Boolean vaulted, String q) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("ownerId"), ownerId));
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (favorite != null) {
                predicates.add(cb.equal(root.get("favorite"), favorite));
            }
            if (vaulted != null) {
                predicates.add(cb.equal(root.get("vaulted"), vaulted));
            }
            if (q != null && !q.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ItemType parseType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return ItemType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "지원하지 않는 type입니다: " + type);
        }
    }

    private SourceType parseImportSource(String raw) {
        if (raw == null || raw.isBlank()) {
            return SourceType.PHOTO;
        }
        try {
            SourceType parsed = SourceType.valueOf(raw.trim().toUpperCase());
            if (parsed != SourceType.SCREENSHOT && parsed != SourceType.PHOTO) {
                throw new IllegalArgumentException();
            }
            return parsed;
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sourceType은 SCREENSHOT|PHOTO만 허용됩니다.");
        }
    }

    private String originalName(MultipartFile file) {
        String name = file.getOriginalFilename();
        return (name == null || name.isBlank()) ? "사진" : name;
    }
}
