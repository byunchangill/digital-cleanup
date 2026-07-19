package com.sortmate.my.entity;

/** 내보내기 잡 상태(계약 my.md MY-05). */
public enum ExportStatus {
    PREPARING, COMPRESSING, DONE, FAILED, CANCELED;

    public boolean isTerminal() {
        return this == DONE || this == FAILED || this == CANCELED;
    }
}
