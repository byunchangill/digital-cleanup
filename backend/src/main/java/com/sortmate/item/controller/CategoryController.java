package com.sortmate.item.controller;

import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.item.dto.CategoryListResponse;
import com.sortmate.item.service.ItemService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ITEM-14 카테고리 목록(필터 칩 구성용). */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final ItemService itemService;

    public CategoryController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public ApiResponse<CategoryListResponse> categories(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return ApiResponse.success(itemService.categories(Long.valueOf(auth.getName())));
    }
}
