package com.sortmate.vault.repository;

import com.sortmate.vault.entity.AccountDeletionRequest;
import com.sortmate.vault.entity.DeletionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountDeletionRequestRepository extends JpaRepository<AccountDeletionRequest, Long> {
    Optional<AccountDeletionRequest> findByUserIdAndStatus(Long userId, DeletionStatus status);
}
