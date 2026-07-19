package com.sortmate.auth.repository;

import com.sortmate.auth.entity.AuthProvider;
import com.sortmate.auth.entity.User;
import com.sortmate.auth.entity.UserPlan;
import com.sortmate.auth.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndProvider(String email, AuthProvider provider);

    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

    boolean existsByEmail(String email);

    // ── admin 전역 집계/목록 ────────────────────────────────────
    /** ADM-01 최근 가입자 상위 N. */
    List<User> findTop4ByOrderByCreatedAtDesc();

    /** ADM-02/03 회원 검색·필터. q/status/plan은 null이면 무시. */
    @Query("select u from User u where "
            + "(:q is null or lower(u.displayName) like lower(concat('%', :q, '%')) "
            + "  or lower(u.email) like lower(concat('%', :q, '%'))) "
            + "and (:status is null or u.status = :status) "
            + "and (:plan is null or u.plan = :plan)")
    Page<User> searchMembers(@Param("q") String q,
                             @Param("status") UserStatus status,
                             @Param("plan") UserPlan plan,
                             Pageable pageable);
}
