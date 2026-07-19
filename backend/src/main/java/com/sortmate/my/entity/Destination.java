package com.sortmate.my.entity;

/** 내보내기 저장 위치(계약 my.md MY-03/04). DOWNLOAD만 실제 가용, 나머지는 stub. */
public enum Destination {
    DOWNLOAD(true), GOOGLE_DRIVE(false), EMAIL(false);

    private final boolean available;

    Destination(boolean available) {
        this.available = available;
    }

    public boolean isAvailable() {
        return available;
    }
}
