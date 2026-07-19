package com.sortmate.item.controller;

import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.ImportResponse;
import com.sortmate.item.dto.ItemDetailDto;
import com.sortmate.item.dto.ItemDto;
import com.sortmate.item.dto.ItemUpdateRequest;
import com.sortmate.item.dto.ItemWrapper;
import com.sortmate.item.dto.MemoCreateRequest;
import com.sortmate.item.dto.PageResponse;
import com.sortmate.item.dto.RelatedItemsResponse;
import com.sortmate.item.dto.ToggleRequests.BulkCategoryRequest;
import com.sortmate.item.dto.ToggleRequests.BulkTagsRequest;
import com.sortmate.item.dto.ToggleRequests.FavoriteRequest;
import com.sortmate.item.dto.ToggleRequests.IdsRequest;
import com.sortmate.item.dto.ToggleRequests.VaultRequest;
import com.sortmate.item.dto.ToggleResponses.BulkUpdateResponse;
import com.sortmate.item.dto.ToggleResponses.DeleteResponse;
import com.sortmate.item.dto.ToggleResponses.FavoriteResponse;
import com.sortmate.item.dto.ToggleResponses.ShareResponse;
import com.sortmate.item.dto.ToggleResponses.VaultResponse;
import com.sortmate.item.service.ItemService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    /** ITEM-01 갤러리 사진 가져오기(다중 업로드). */
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public ApiResponse<ImportResponse> importItems(Authentication auth,
                                                   @RequestParam("files") List<MultipartFile> files,
                                                   @RequestParam(value = "sourceType", required = false) String sourceType) {
        return ApiResponse.success(itemService.importItems(userId(auth), files, sourceType));
    }

    /** ITEM-02 메모 아이템 생성. */
    @PostMapping("/memo")
    public ApiResponse<ItemWrapper<ItemDetailDto>> createMemo(Authentication auth,
                                                              @Valid @RequestBody MemoCreateRequest request) {
        return ApiResponse.success(ItemWrapper.of(itemService.createMemo(userId(auth), request)));
    }

    /** ITEM-03 라이브러리 아이템 목록. */
    @GetMapping
    public ApiResponse<PageResponse<ItemDto>> list(Authentication auth,
                                                   @RequestParam(required = false) String type,
                                                   @RequestParam(required = false) String category,
                                                   @RequestParam(required = false) Boolean favorite,
                                                   @RequestParam(required = false) Boolean vaulted,
                                                   @RequestParam(required = false) String q,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size,
                                                   @RequestParam(defaultValue = "savedAt,desc") String sort) {
        Pageable pageable = PageableFactory.of(page, size, sort);
        return ApiResponse.success(itemService.list(userId(auth), type, category, favorite, vaulted, q, pageable));
    }

    /** ITEM-07 즐겨찾기 목록. */
    @GetMapping("/favorites")
    public ApiResponse<PageResponse<ItemDto>> favorites(Authentication auth,
                                                        @RequestParam(required = false) String type,
                                                        @RequestParam(required = false) String q,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size,
                                                        @RequestParam(defaultValue = "savedAt,desc") String sort) {
        Pageable pageable = PageableFactory.of(page, size, sort);
        return ApiResponse.success(itemService.favorites(userId(auth), type, q, pageable));
    }

    /** ITEM-04 아이템 상세. */
    @GetMapping("/{id}")
    public ApiResponse<ItemWrapper<ItemDetailDto>> detail(Authentication auth, @PathVariable Long id) {
        return ApiResponse.success(ItemWrapper.of(itemService.getDetail(userId(auth), id)));
    }

    /** ITEM-05 관련 아이템. */
    @GetMapping("/{id}/related")
    public ApiResponse<RelatedItemsResponse> related(Authentication auth, @PathVariable Long id,
                                                     @RequestParam(defaultValue = "4") int limit) {
        return ApiResponse.success(itemService.related(userId(auth), id, limit));
    }

    /** ITEM-06 아이템 수정(PATCH). */
    @PatchMapping("/{id}")
    public ApiResponse<ItemWrapper<ItemDetailDto>> update(Authentication auth, @PathVariable Long id,
                                                          @Valid @RequestBody ItemUpdateRequest request) {
        return ApiResponse.success(ItemWrapper.of(itemService.update(userId(auth), id, request)));
    }

    /** ITEM-08 즐겨찾기 토글. */
    @PutMapping("/{id}/favorite")
    public ApiResponse<FavoriteResponse> favorite(Authentication auth, @PathVariable Long id,
                                                  @Valid @RequestBody FavoriteRequest request) {
        return ApiResponse.success(itemService.toggleFavorite(userId(auth), id, request.favorite()));
    }

    /** ITEM-12 비밀 보관함 토글. */
    @PutMapping("/{id}/vault")
    public ApiResponse<VaultResponse> vault(Authentication auth, @PathVariable Long id,
                                            @Valid @RequestBody VaultRequest request) {
        return ApiResponse.success(itemService.toggleVault(userId(auth), id, request.vaulted()));
    }

    /** ITEM-09 아이템 삭제(단건/일괄). */
    @PostMapping("/delete")
    public ApiResponse<DeleteResponse> delete(Authentication auth, @Valid @RequestBody IdsRequest request) {
        return ApiResponse.success(itemService.delete(userId(auth), request.ids()));
    }

    /** ITEM-10 일괄 카테고리 이동. */
    @PostMapping("/bulk/category")
    public ApiResponse<BulkUpdateResponse> bulkCategory(Authentication auth,
                                                        @Valid @RequestBody BulkCategoryRequest request) {
        return ApiResponse.success(itemService.bulkCategory(userId(auth), request.ids(), request.category()));
    }

    /** ITEM-11 일괄 태그 추가. */
    @PostMapping("/bulk/tags")
    public ApiResponse<BulkUpdateResponse> bulkTags(Authentication auth,
                                                    @Valid @RequestBody BulkTagsRequest request) {
        return ApiResponse.success(itemService.bulkTags(userId(auth), request.ids(), request.tags()));
    }

    /** ITEM-13 아이템 공유. */
    @PostMapping("/share")
    public ApiResponse<ShareResponse> share(Authentication auth, @Valid @RequestBody IdsRequest request) {
        return ApiResponse.success(itemService.share(userId(auth), request.ids()));
    }

    /** 인증 주체(JWT sub=userId)에서 사용자 id 추출. */
    private Long userId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        try {
            return Long.valueOf(auth.getName());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
    }
}
