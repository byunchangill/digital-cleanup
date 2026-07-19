package com.sortmate.admin.entity;

/** CS 티켓 처리 상태. 미처리 CS 집계는 status != RESOLVED. */
public enum CsStatus {
    OPEN, IN_PROGRESS, RESOLVED
}
