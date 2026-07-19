package com.sortmate.item.service;

import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.ItemDetailDto;
import com.sortmate.item.dto.ItemUpdateRequest;
import com.sortmate.item.dto.MemoCreateRequest;
import com.sortmate.item.dto.ToggleResponses.BulkUpdateResponse;
import com.sortmate.item.dto.ToggleResponses.DeleteResponse;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItemServiceTest {

    @Mock private ItemRepository itemRepository;
    @InjectMocks private ItemService itemService;

    private static final long OWNER = 1L;

    private Item item(long id, long ownerId) {
        Item item = Item.builder().ownerId(ownerId).type(ItemType.MEMO).title("t").build();
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    // ── 소유권 검사(공통) ─────────────────────────────────────
    @Test
    @DisplayName("상세: 존재하지 않으면 ITEM_NOT_FOUND")
    void detailNotFound() {
        when(itemRepository.findByIdAndOwnerId(9L, OWNER)).thenReturn(Optional.empty());
        when(itemRepository.existsById(9L)).thenReturn(false);
        assertThatThrownBy(() -> itemService.getDetail(OWNER, 9L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ITEM_NOT_FOUND);
    }

    @Test
    @DisplayName("상세: 타인 소유면 ITEM_FORBIDDEN")
    void detailForbidden() {
        when(itemRepository.findByIdAndOwnerId(9L, OWNER)).thenReturn(Optional.empty());
        when(itemRepository.existsById(9L)).thenReturn(true);
        assertThatThrownBy(() -> itemService.getDetail(OWNER, 9L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ITEM_FORBIDDEN);
    }

    // ── ITEM-02 메모 생성 ─────────────────────────────────────
    @Test
    @DisplayName("메모 생성: 제목 미입력 시 '제목 없음', vaulted=true 반영")
    void createMemoDefaults() {
        when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));
        ItemDetailDto dto = itemService.createMemo(OWNER,
                new MemoCreateRequest(" ", "본문", List.of("초안"), "메모", true, null));
        assertThat(dto.title()).isEqualTo("제목 없음");
        assertThat(dto.type()).isEqualTo("MEMO");
        assertThat(dto.vaulted()).isTrue();
    }

    // ── ITEM-06 수정 ──────────────────────────────────────────
    @Test
    @DisplayName("수정: 빈 요청이면 VALIDATION_ERROR")
    void updateEmpty() {
        assertThatThrownBy(() -> itemService.update(OWNER, 1L,
                new ItemUpdateRequest(null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("수정: 전달된 필드만 변경(부분 수정)")
    void updatePartial() {
        Item stored = item(1L, OWNER);
        stored.updateTitle("old");
        stored.updateCategory("cat");
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(stored));

        ItemDetailDto dto = itemService.update(OWNER, 1L,
                new ItemUpdateRequest("new", null, null, null));

        assertThat(dto.title()).isEqualTo("new");
        assertThat(dto.category()).isEqualTo("cat"); // 미전달 → 유지
    }

    // ── ITEM-09 삭제(부분 실패는 200 + failedIds) ─────────────
    @Test
    @DisplayName("삭제: 소유하지 않은 id는 failedIds로 반환")
    void deletePartial() {
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(item(1L, OWNER)));
        when(itemRepository.findByIdAndOwnerId(2L, OWNER)).thenReturn(Optional.empty());

        DeleteResponse res = itemService.delete(OWNER, List.of(1L, 2L));

        assertThat(res.deletedCount()).isEqualTo(1);
        assertThat(res.failedIds()).containsExactly(2L);
    }

    // ── ITEM-11 태그 append(기존 유지, 중복 제거) ──────────────
    @Test
    @DisplayName("일괄 태그: 기존 태그 유지하며 중복 없이 append")
    void bulkTagsAppend() {
        Item stored = item(1L, OWNER);
        stored.replaceTags(List.of("a", "b"));
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(stored));

        BulkUpdateResponse res = itemService.bulkTags(OWNER, List.of(1L), List.of("b", "c"));

        assertThat(res.updatedCount()).isEqualTo(1);
        assertThat(stored.getTags()).containsExactly("a", "b", "c");
    }

    // ── ITEM-01 import 검증 ───────────────────────────────────
    @Test
    @DisplayName("가져오기: 파일 없으면 VALIDATION_ERROR")
    void importNoFiles() {
        assertThatThrownBy(() -> itemService.importItems(OWNER, List.of(), "PHOTO"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("가져오기: 이미지가 아니면 UNSUPPORTED_MEDIA_TYPE")
    void importNonImage() {
        MockMultipartFile pdf = new MockMultipartFile("files", "a.pdf", "application/pdf", new byte[]{1});
        assertThatThrownBy(() -> itemService.importItems(OWNER, List.of(pdf), "PHOTO"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    @DisplayName("가져오기: 상한 초과 시 FILE_TOO_LARGE")
    void importTooLarge() {
        byte[] big = new byte[(int) ItemService.MAX_FILE_BYTES + 1];
        MockMultipartFile img = new MockMultipartFile("files", "big.jpg", "image/jpeg", big);
        assertThatThrownBy(() -> itemService.importItems(OWNER, List.of(img), "SCREENSHOT"))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.FILE_TOO_LARGE);
    }

    @Test
    @DisplayName("가져오기: 정상 이미지는 저장되고 sourceType=SCREENSHOT이면 type=SCREENSHOT")
    void importSuccess() {
        when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile img = new MockMultipartFile("files", "s.png", "image/png", new byte[]{1, 2, 3});

        var res = itemService.importItems(OWNER, List.of(img), "SCREENSHOT");

        assertThat(res.importedCount()).isEqualTo(1);
        assertThat(res.items().get(0).type()).isEqualTo("SCREENSHOT");
    }

    // ── ITEM-13 공유(vaulted는 볼트 세션 조건부) ──────────────
    @Test
    @DisplayName("공유: vaulted 포함 + 볼트 세션 없음이면 VAULT_LOCKED")
    void shareVaultedLocked() {
        Item vaulted = item(1L, OWNER);
        vaulted.setVaulted(true);
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(vaulted));

        assertThatThrownBy(() -> itemService.share(OWNER, List.of(1L), false))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VAULT_LOCKED);
    }

    @Test
    @DisplayName("공유: vaulted 포함 + 볼트 세션 활성이면 조건부 허용")
    void shareVaultedUnlocked() {
        Item vaulted = item(1L, OWNER);
        vaulted.setVaulted(true);
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(vaulted));

        var res = itemService.share(OWNER, List.of(1L), true);
        assertThat(res.shareUrl()).startsWith("https://sortmate.app/s/");
    }

    @Test
    @DisplayName("공유: 정상(비-vaulted) 아이템은 shareUrl 발급")
    void shareSuccess() {
        when(itemRepository.findByIdAndOwnerId(1L, OWNER)).thenReturn(Optional.of(item(1L, OWNER)));
        var res = itemService.share(OWNER, List.of(1L), false);
        assertThat(res.shareUrl()).startsWith("https://sortmate.app/s/");
        assertThat(res.expiresAt()).isNotNull();
    }

    // ── 목록 type 검증 ────────────────────────────────────────
    @Test
    @DisplayName("목록: 잘못된 type이면 VALIDATION_ERROR")
    void listBadType() {
        lenient().when(itemRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class))).thenReturn(null);
        assertThatThrownBy(() -> itemService.list(OWNER, "NOPE", null, null, null, null, null))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }
}
