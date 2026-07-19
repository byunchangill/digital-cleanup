package com.sortmate.auth.entity;

/**
 * 회원 표시용 플랜 배지(admin 화면 근거). 결제 모듈 미존재 → 기본 FREE.
 * my.entity.Plan(구독/가격 상수, FREE/PREMIUM)과 별개 — 이름 충돌 회피 위해 UserPlan.
 * JSON에는 name()(FREE|BASIC|PREMIUM)만 노출.
 */
public enum UserPlan {
    FREE, BASIC, PREMIUM
}
