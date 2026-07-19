package com.sortmate.cleanup.service;

import com.sortmate.cleanup.dto.DuplicateDtos.DismissResponse;
import com.sortmate.cleanup.dto.DuplicateDtos.ResolveResponse;
import com.sortmate.cleanup.dto.RunDtos.RunResponse;
import com.sortmate.cleanup.dto.ScreenshotDtos.ScreenshotListResponse;
import com.sortmate.cleanup.dto.SettingsDtos.SettingsUpdateRequest;
import com.sortmate.cleanup.entity.CleanupGroup;
import com.sortmate.cleanup.entity.CleanupGroupStatus;
import com.sortmate.cleanup.entity.CleanupStat;
import com.sortmate.cleanup.entity.DuplicateCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidate;
import com.sortmate.cleanup.entity.ScreenshotCandidateStatus;
import com.sortmate.cleanup.entity.ScreenshotReason;
import com.sortmate.cleanup.repository.CleanupGroupRepository;
import com.sortmate.cleanup.repository.CleanupSettingsRepository;
import com.sortmate.cleanup.repository.CleanupStatRepository;
import com.sortmate.cleanup.repository.ScreenshotCandidateRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.ToggleResponses.DeleteResponse;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import com.sortmate.item.service.ItemService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CleanupServiceTest {

    @Mock private CleanupGroupRepository groupRepository;
    @Mock private ScreenshotCandidateRepository screenshotRepository;
    @Mock private CleanupSettingsRepository settingsRepository;
    @Mock private CleanupStatRepository statRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private ItemService itemService;
    @InjectMocks private CleanupService service;

    private static final long OWNER = 1L;

    private CleanupGroup group(long groupId, CleanupGroupStatus status, long recommendedItemId, long... otherItemIds) {
        CleanupGroup g = CleanupGroup.builder().userId(OWNER).summary("3개의 유사한 스크린샷")
                .estimatedSaveBytes(400_000L).status(status).build();
        ReflectionTestUtils.setField(g, "id", groupId);
        g.addCandidate(candidate(recommendedItemId, 300_000L, true));
        for (long id : otherItemIds) {
            g.addCandidate(candidate(id, 200_000L, false));
        }
        return g;
    }

    private DuplicateCandidate candidate(long itemId, long fileSize, boolean keep) {
        return DuplicateCandidate.builder().itemId(itemId).width(2400).height(1080)
                .fileSize(fileSize).capturedAt(Instant.now()).recommendedKeep(keep).build();
    }

    private void stubStat() {
        lenient().when(statRepository.findByUserId(OWNER))
                .thenReturn(Optional.of(CleanupStat.empty(OWNER)));
    }

    // ── CLEAN-03 resolve ───────────────────────────────────────
    @Test
    @DisplayName("resolve: 유지본 외 삭제, RESOLVED 전이, savedBytes는 삭제분 합계")
    void resolveDeletesOthers() {
        stubStat();
        CleanupGroup g = group(10L, CleanupGroupStatus.PENDING, 100L, 200L, 300L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        when(itemService.delete(eq(OWNER), any())).thenReturn(new DeleteResponse(2, List.of()));

        ResolveResponse res = service.resolve(OWNER, 10L, 100L);

        assertThat(res.status()).isEqualTo("RESOLVED");
        assertThat(res.keptItemId()).isEqualTo(100L);
        assertThat(res.deletedItemIds()).containsExactlyInAnyOrder(200L, 300L);
        assertThat(res.savedBytes()).isEqualTo(400_000L); // 200k + 200k
        assertThat(res.failedIds()).isEmpty();
        assertThat(g.getStatus()).isEqualTo(CleanupGroupStatus.RESOLVED);
    }

    @Test
    @DisplayName("resolve: 일부 삭제 실패 시 failedIds 반영, savedBytes는 성공분만")
    void resolvePartialFailure() {
        stubStat();
        CleanupGroup g = group(10L, CleanupGroupStatus.PENDING, 100L, 200L, 300L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        when(itemService.delete(eq(OWNER), any())).thenReturn(new DeleteResponse(1, List.of(300L)));

        ResolveResponse res = service.resolve(OWNER, 10L, 100L);

        assertThat(res.deletedItemIds()).containsExactly(200L);
        assertThat(res.failedIds()).containsExactly(300L);
        assertThat(res.savedBytes()).isEqualTo(200_000L);
    }

    @Test
    @DisplayName("resolve: keepItemId가 그룹 후보가 아니면 VALIDATION_ERROR")
    void resolveKeepNotInGroup() {
        CleanupGroup g = group(10L, CleanupGroupStatus.PENDING, 100L, 200L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        assertThatThrownBy(() -> service.resolve(OWNER, 10L, 999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("resolve: 존재하지 않는 그룹이면 CLEANUP_GROUP_NOT_FOUND")
    void resolveGroupNotFound() {
        when(groupRepository.findByIdAndUserId(77L, OWNER)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolve(OWNER, 77L, 100L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.CLEANUP_GROUP_NOT_FOUND);
    }

    @Test
    @DisplayName("resolve: 이미 처리된 그룹이면 CLEANUP_GROUP_ALREADY_RESOLVED")
    void resolveAlreadyResolved() {
        CleanupGroup g = group(10L, CleanupGroupStatus.RESOLVED, 100L, 200L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        assertThatThrownBy(() -> service.resolve(OWNER, 10L, 100L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.CLEANUP_GROUP_ALREADY_RESOLVED);
    }

    // ── CLEAN-04 dismiss ───────────────────────────────────────
    @Test
    @DisplayName("dismiss: PENDING 그룹을 DISMISSED로 전이, 항목은 삭제하지 않음")
    void dismissMarksDismissed() {
        CleanupGroup g = group(10L, CleanupGroupStatus.PENDING, 100L, 200L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        DismissResponse res = service.dismiss(OWNER, 10L);
        assertThat(res.status()).isEqualTo("DISMISSED");
        assertThat(g.getStatus()).isEqualTo(CleanupGroupStatus.DISMISSED);
    }

    @Test
    @DisplayName("dismiss: 이미 처리된 그룹이면 CLEANUP_GROUP_ALREADY_RESOLVED")
    void dismissAlreadyResolved() {
        CleanupGroup g = group(10L, CleanupGroupStatus.DISMISSED, 100L, 200L);
        when(groupRepository.findByIdAndUserId(10L, OWNER)).thenReturn(Optional.of(g));
        assertThatThrownBy(() -> service.dismiss(OWNER, 10L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.CLEANUP_GROUP_ALREADY_RESOLVED);
    }

    // ── CLEAN-07 run ───────────────────────────────────────────
    @Test
    @DisplayName("run(DUPLICATE): 추천 유지본 외 삭제하고 그룹 RESOLVED, byType 집계")
    void runDuplicates() {
        stubStat();
        CleanupGroup g = group(10L, CleanupGroupStatus.PENDING, 100L, 200L, 300L);
        when(groupRepository.findByUserIdAndStatus(OWNER, CleanupGroupStatus.PENDING))
                .thenReturn(List.of(g));
        when(itemService.delete(eq(OWNER), any())).thenReturn(new DeleteResponse(2, List.of()));

        RunResponse res = service.run(OWNER, List.of("DUPLICATE"));

        assertThat(res.deletedCount()).isEqualTo(2);
        assertThat(res.savedBytes()).isEqualTo(400_000L);
        assertThat(res.resolvedGroupIds()).containsExactly(10L);
        assertThat(res.byType()).anyMatch(b -> b.type().equals("DUPLICATE") && b.deletedCount() == 2);
        assertThat(g.getStatus()).isEqualTo(CleanupGroupStatus.RESOLVED);
    }

    @Test
    @DisplayName("run: 잘못된 type이면 VALIDATION_ERROR")
    void runBadType() {
        assertThatThrownBy(() -> service.run(OWNER, List.of("EVERYTHING")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    // ── CLEAN-05 screenshots ───────────────────────────────────
    @Test
    @DisplayName("screenshots: 삭제된 Item 참조 후보는 목록에서 제외, reasonCounts는 남은 후보 기준")
    void screenshotsFilterDeletedItems() {
        ScreenshotCandidate live = screenshotCandidate(1L, 100L, ScreenshotReason.ONE_TIME, true);
        ScreenshotCandidate orphan = screenshotCandidate(2L, 999L, ScreenshotReason.BLURRY, false);
        when(screenshotRepository.findByUserIdAndStatus(OWNER, ScreenshotCandidateStatus.PENDING))
                .thenReturn(List.of(live, orphan));
        // itemId=100만 존재(999는 이미 삭제됨)
        Item item = item(100L, "탑승권 QR");
        when(itemRepository.findByOwnerIdAndIdIn(eq(OWNER), any())).thenReturn(List.of(item));

        ScreenshotListResponse res = service.listScreenshots(OWNER, null, 0, 20);

        assertThat(res.candidates()).hasSize(1);
        assertThat(res.candidates().get(0).itemId()).isEqualTo(100L);
        assertThat(res.reasonCounts()).anyMatch(rc -> rc.reason().equals("ONE_TIME") && rc.count() == 1);
        assertThat(res.reasonCounts()).noneMatch(rc -> rc.reason().equals("BLURRY"));
    }

    @Test
    @DisplayName("screenshots: 잘못된 reason이면 VALIDATION_ERROR")
    void screenshotsBadReason() {
        assertThatThrownBy(() -> service.listScreenshots(OWNER, "WEIRD", 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    // ── CLEAN-10 settings ──────────────────────────────────────
    @Test
    @DisplayName("updateSettings: 빈 요청이면 VALIDATION_ERROR")
    void updateSettingsEmpty() {
        assertThatThrownBy(() -> service.updateSettings(OWNER,
                new SettingsUpdateRequest(null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("getSettings: 설정이 없으면 기본값 반환(autoTrashExpired=true, threshold=90)")
    void getSettingsDefaults() {
        when(settingsRepository.findByUserId(OWNER)).thenReturn(Optional.empty());
        lenient().when(statRepository.findByUserId(OWNER)).thenReturn(Optional.empty());
        var res = service.getSettings(OWNER);
        assertThat(res.autoTrashExpired()).isTrue();
        assertThat(res.smartScreenshotDetection()).isFalse();
        assertThat(res.unusedThresholdDays()).isEqualTo(90);
        assertThat(res.monthlySavedBytes()).isZero();
    }

    private ScreenshotCandidate screenshotCandidate(long id, long itemId, ScreenshotReason reason, boolean selected) {
        ScreenshotCandidate c = ScreenshotCandidate.builder().userId(OWNER).itemId(itemId)
                .reason(reason).recommendationText("추천").capturedAt(Instant.now())
                .defaultSelected(selected).status(ScreenshotCandidateStatus.PENDING).build();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    private Item item(long id, String title) {
        Item i = Item.builder().ownerId(OWNER).type(ItemType.SCREENSHOT).title(title)
                .fileSize(180_000L).savedAt(Instant.now()).build();
        ReflectionTestUtils.setField(i, "id", id);
        return i;
    }
}
