package com.sortmate.admin.service;

import com.sortmate.auth.entity.Role;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.repository.UserRepository;
import com.sortmate.common.BusinessException;
import com.sortmate.common.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * admin 라우트 인가 가드. SecurityConfig가 이미 인증(anyRequest authenticated)을 강제하므로
 * 미인증은 401(EntryPoint)로 처리되고, 여기서는 인증됐으나 role≠ADMIN인 경우 403 ADMIN_REQUIRED.
 */
@Component
public class AdminGuard {

    private final UserRepository userRepository;

    public AdminGuard(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** 인증 주체가 ADMIN인지 검증. 아니면 403. */
    public void requireAdmin(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        Long userId;
        try {
            userId = Long.valueOf(auth.getName());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALID));
        if (user.getRole() != Role.ADMIN) {
            throw new BusinessException(ErrorCode.ADMIN_REQUIRED);
        }
    }
}
