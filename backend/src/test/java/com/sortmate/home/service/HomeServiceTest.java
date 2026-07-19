package com.sortmate.home.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.home.dto.DashboardResponse;
import com.sortmate.home.dto.SearchInterpretation;
import com.sortmate.home.dto.SearchResponse;
import com.sortmate.home.dto.SearchResultItem;
import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import com.sortmate.item.repository.ItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeServiceTest {

    @Mock private ItemRepository itemRepository;
    @InjectMocks private HomeService homeService;

    private static final long OWNER = 1L;

    private Item item(long id, ItemType type, String title, String category, boolean vaulted,
                      LocalDate expiry, Instant savedAt, List<String> tags) {
        Item item = Item.builder().ownerId(OWNER).type(type).title(title).category(category)
                .vaulted(vaulted).expiryDate(expiry).tags(tags).savedAt(savedAt).build();
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    // ── HOME-01 ────────────────────────────────────────────────
    @Test
    @DisplayName("대시보드: 중복 사진(동일 제목)·만료 임박 집계, 최근 목록은 vault 제외")
    void dashboardAggregates() {
        Instant now = Instant.now();
        List<Item> items = List.of(
                item(1, ItemType.SCREENSHOT, "캡처", "사진", false, null, now.minus(1, ChronoUnit.HOURS), List.of()),
                item(2, ItemType.SCREENSHOT, "캡처", "사진", false, null, now.minus(2, ChronoUnit.HOURS), List.of()),
                item(3, ItemType.SCREENSHOT, "캡처", "사진", false, null, now.minus(3, ChronoUnit.HOURS), List.of()),
                item(4, ItemType.SCREENSHOT, "쿠폰", "쿠폰", false, LocalDate.now().plusDays(3), now.minus(4, ChronoUnit.HOURS), List.of()),
                item(5, ItemType.MEMO, "비밀", "메모", true, null, now.minus(5, ChronoUnit.HOURS), List.of())
        );
        when(itemRepository.findByOwnerId(OWNER)).thenReturn(items);
        when(itemRepository.aggregateCategories(OWNER)).thenReturn(List.of());

        DashboardResponse res = homeService.dashboard(OWNER, null);

        // 동일 제목 스크린샷 3장 → 중복 2건
        assertThat(res.suggestions()).anyMatch(s -> s.type().equals("DUPLICATE_PHOTOS") && s.count() == 2);
        assertThat(res.suggestions()).anyMatch(s -> s.type().equals("EXPIRING_ITEMS") && s.count() == 1);
        // vault(id=5) 제외
        assertThat(res.recentItems()).extracting(i -> i.id()).doesNotContain(5L);
        assertThat(res.recentItems().get(0).id()).isEqualTo(1L); // savedAt desc
    }

    @Test
    @DisplayName("대시보드: recentSize 범위 초과면 VALIDATION_ERROR")
    void dashboardRecentSizeRange() {
        assertThatThrownBy(() -> homeService.dashboard(OWNER, 21))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("대시보드: 제안 조건 없으면 suggestions 빈 배열")
    void dashboardNoSuggestions() {
        Instant now = Instant.now();
        when(itemRepository.findByOwnerId(OWNER)).thenReturn(List.of(
                item(1, ItemType.MEMO, "메모A", "메모", false, null, now, List.of())));
        when(itemRepository.aggregateCategories(OWNER)).thenReturn(List.of());
        assertThat(homeService.dashboard(OWNER, null).suggestions()).isEmpty();
    }

    // ── HOME-02 ────────────────────────────────────────────────
    @Test
    @DisplayName("검색: 유형+기간 해석, 키워드 일치 결과를 matchScore desc로 반환")
    void searchInterpretsAndScores() {
        Instant now = Instant.now();
        List<Item> items = List.of(
                item(1, ItemType.SCREENSHOT, "와이파이 비밀번호", "메모", false, null, now, List.of("와이파이")),
                item(2, ItemType.SCREENSHOT, "다른 캡처", "사진", false, null, now, List.of()),
                item(3, ItemType.MEMO, "와이파이 노트", "메모", false, null, now, List.of())
        );
        when(itemRepository.findByOwnerId(OWNER)).thenReturn(items);

        SearchResponse res = homeService.search(OWNER, "스크린샷 와이파이", "NORMAL", null, null, 0, 20);

        assertThat(res.interpretations()).extracting(SearchInterpretation::type).contains("ITEM_TYPE", "KEYWORD");
        // type=SCREENSHOT 필터 + 키워드 '와이파이' 일치 → id=1만
        assertThat(res.results()).hasSize(1);
        assertThat(res.results().get(0).id()).isEqualTo(1L);
        assertThat(res.results().get(0).matchScore()).isBetween(1, 100);
        assertThat(res.totalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("검색: 결과 없으면 assistantHint 제공, results 빈 배열")
    void searchEmptyGivesHint() {
        when(itemRepository.findByOwnerId(OWNER)).thenReturn(List.of(
                Item.builder().ownerId(OWNER).type(ItemType.MEMO).title("장보기").savedAt(Instant.now()).build()));
        SearchResponse res = homeService.search(OWNER, "블루베리 팬케이크", "NORMAL", null, null, 0, 20);
        assertThat(res.results()).isEmpty();
        assertThat(res.assistantHint()).isNotNull();
        assertThat(res.totalPages()).isZero();
    }

    @Test
    @DisplayName("검색: q 공백이면 VALIDATION_ERROR")
    void searchBlankQuery() {
        assertThatThrownBy(() -> homeService.search(OWNER, "  ", "NORMAL", null, null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("검색: 잘못된 mode면 VALIDATION_ERROR")
    void searchBadMode() {
        assertThatThrownBy(() -> homeService.search(OWNER, "쿠폰", "TURBO", null, null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("검색: ASSISTANT 모드는 결과가 있어도 assistantHint 제공")
    void searchAssistantHint() {
        when(itemRepository.findByOwnerId(OWNER)).thenReturn(List.of(
                item(1, ItemType.SCREENSHOT, "쿠폰 스타벅스", "쿠폰", false, null, Instant.now(), List.of("쿠폰"))));
        SearchResponse res = homeService.search(OWNER, "쿠폰", "ASSISTANT", null, null, 0, 20);
        assertThat(res.results()).isNotEmpty();
        assertThat(res.assistantHint()).isNotNull();
    }

    @Test
    @DisplayName("검색 결과 카드: ItemDto가 @JsonUnwrapped로 평탄화되고 matchScore가 최상위에 온다")
    void searchResultSerializesFlat() throws Exception {
        Item i = item(7, ItemType.SCREENSHOT, "쿠폰", "쿠폰", false, null, Instant.now(), List.of("쿠폰"));
        SearchResultItem card = SearchResultItem.of(i, 92);
        JsonNode node = new ObjectMapper().findAndRegisterModules().valueToTree(card);
        assertThat(node.has("matchScore")).isTrue();
        assertThat(node.get("matchScore").asInt()).isEqualTo(92);
        assertThat(node.get("id").asLong()).isEqualTo(7L); // Item 표준 필드가 최상위로 평탄화
        assertThat(node.has("item")).isFalse();
        assertThat(node.has("title")).isTrue();
    }

    @Test
    @DisplayName("검색: vaulted 결과는 thumbnailUrl 마스킹(item 계약 공유)")
    void searchMasksVaulted() {
        Item vaulted = Item.builder().ownerId(OWNER).type(ItemType.SCREENSHOT).title("비밀 쿠폰")
                .category("쿠폰").vaulted(true).thumbnailUrl("/media/secret/thumb")
                .tags(List.of("쿠폰")).savedAt(Instant.now()).build();
        ReflectionTestUtils.setField(vaulted, "id", 9L);
        lenient().when(itemRepository.findByOwnerId(OWNER)).thenReturn(List.of(vaulted));
        SearchResponse res = homeService.search(OWNER, "쿠폰", "NORMAL", null, null, 0, 20);
        assertThat(res.results()).hasSize(1);
        assertThat(res.results().get(0).thumbnailUrl()).isNull();
        assertThat(res.results().get(0).vaulted()).isTrue();
    }
}
