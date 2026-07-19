package com.sortmate.my.entity;

import java.util.List;

/**
 * 구독 플랜 상수(계약 my.md MY-08). 화면 카피가 고정이므로 features/가격은 서버 상수.
 * storageBytes는 MY-07 저장공간 한도(totalBytes)의 원천이기도 하다.
 */
public enum Plan {

    FREE("무료", 0, 5L * 1024 * 1024 * 1024,
            List.of("기본 AI 분류", "5GB 클라우드 저장 공간", "표준 암호화"), null),
    PREMIUM("프리미엄", 9900, 500L * 1024 * 1024 * 1024,
            List.of("무제한 AI 분석", "500GB 저장 공간", "고급 보안 프로토콜", "24/7 우선 지원"), "가장 인기 있음");

    public static final String CURRENCY = "KRW";

    private final String displayName;
    private final int priceMonthly;
    private final long storageBytes;
    private final List<String> features;
    private final String badge;

    Plan(String displayName, int priceMonthly, long storageBytes, List<String> features, String badge) {
        this.displayName = displayName;
        this.priceMonthly = priceMonthly;
        this.storageBytes = storageBytes;
        this.features = features;
        this.badge = badge;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getPriceMonthly() {
        return priceMonthly;
    }

    public long getStorageBytes() {
        return storageBytes;
    }

    public List<String> getFeatures() {
        return features;
    }

    public String getBadge() {
        return badge;
    }
}
