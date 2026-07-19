package com.sortmate.auth.entity;

/** 회원 상태. adm_001(Active/Pending) + adm_003_2(활성/휴면) 합집합. 기본 ACTIVE. */
public enum UserStatus {
    ACTIVE, DORMANT, PENDING
}
