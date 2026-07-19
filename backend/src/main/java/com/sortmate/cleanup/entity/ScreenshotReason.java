package com.sortmate.cleanup.entity;

/** 불필요 스크린샷 사유(계약 CLEAN-05). label은 화면 칩/태그 표기. */
public enum ScreenshotReason {
    ONE_TIME("일회성"),
    BLURRY("흐릿함"),
    INFO("정보");

    private final String label;

    ScreenshotReason(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
