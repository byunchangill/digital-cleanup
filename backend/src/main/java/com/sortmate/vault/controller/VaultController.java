package com.sortmate.vault.controller;

import com.sortmate.common.ApiResponse;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import com.sortmate.vault.dto.VaultDtos.DeletionRequestBody;
import com.sortmate.vault.dto.VaultDtos.DeletionResponse;
import com.sortmate.vault.dto.VaultDtos.PinSetRequest;
import com.sortmate.vault.dto.VaultDtos.PinSetResponse;
import com.sortmate.vault.dto.VaultDtos.PrivacyResponse;
import com.sortmate.vault.dto.VaultDtos.PrivacyUpdateRequest;
import com.sortmate.vault.dto.VaultDtos.UnlockRequest;
import com.sortmate.vault.dto.VaultDtos.UnlockResponse;
import com.sortmate.vault.dto.VaultDtos.VaultItemWrapper;
import com.sortmate.vault.dto.VaultDtos.VaultStatusResponse;
import com.sortmate.vault.service.VaultService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    /** 볼트 세션 토큰을 담는 요청 헤더(계약 vault.md). */
    public static final String VAULT_TOKEN_HEADER = "X-Vault-Token";

    private final VaultService vaultService;

    public VaultController(VaultService vaultService) {
        this.vaultService = vaultService;
    }

    /** VAULT-01 PIN 설정/변경. */
    @PostMapping("/pin")
    public ApiResponse<PinSetResponse> setPin(Authentication auth,
                                              @Valid @RequestBody PinSetRequest request) {
        return ApiResponse.success(vaultService.setPin(userId(auth), request));
    }

    /** VAULT-02 볼트 상태 조회. */
    @GetMapping("/status")
    public ApiResponse<VaultStatusResponse> status(
            Authentication auth,
            @RequestHeader(value = VAULT_TOKEN_HEADER, required = false) String vaultToken) {
        return ApiResponse.success(vaultService.status(userId(auth), vaultToken));
    }

    /** VAULT-03 PIN 검증 → 볼트 잠금 해제(세션 발급). */
    @PostMapping("/unlock")
    public ApiResponse<UnlockResponse> unlock(Authentication auth,
                                              @Valid @RequestBody UnlockRequest request) {
        return ApiResponse.success(vaultService.unlock(userId(auth), request.pin()));
    }

    /** VAULT-04 시크릿 아이템 마스킹 해제 열람. */
    @GetMapping("/items/{id}")
    public ApiResponse<VaultItemWrapper> readItem(
            Authentication auth, @PathVariable Long id,
            @RequestHeader(value = VAULT_TOKEN_HEADER, required = false) String vaultToken) {
        return ApiResponse.success(vaultService.readVaultItem(userId(auth), id, vaultToken));
    }

    /** VAULT-05 프라이버시 설정 조회. */
    @GetMapping("/privacy")
    public ApiResponse<PrivacyResponse> getPrivacy(Authentication auth) {
        return ApiResponse.success(vaultService.getPrivacy(userId(auth)));
    }

    /** VAULT-06 프라이버시 설정 변경(부분 수정). */
    @PatchMapping("/privacy")
    public ApiResponse<PrivacyResponse> updatePrivacy(Authentication auth,
                                                      @Valid @RequestBody PrivacyUpdateRequest request) {
        return ApiResponse.success(vaultService.updatePrivacy(userId(auth), request));
    }

    /** VAULT-07 계정 데이터 삭제 요청. */
    @PostMapping("/account/deletion-request")
    public ApiResponse<DeletionResponse> requestDeletion(Authentication auth,
                                                         @Valid @RequestBody DeletionRequestBody request) {
        return ApiResponse.success(vaultService.requestDeletion(userId(auth)));
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
