package com.sortmate.cleanup.dto;

import java.util.List;

/** CLEAN-07 한꺼번에 정리하기 DTO 모음. */
public final class RunDtos {

    private RunDtos() {
    }

    /** types 생략 시 전체 READY 카테고리 대상(명세 가정). */
    public record RunRequest(List<String> types) {
    }

    public record RunResponse(
            int deletedCount,
            long savedBytes,
            List<Long> resolvedGroupIds,
            List<ByTypeResult> byType,
            List<Long> failedIds
    ) {
    }

    public record ByTypeResult(String type, int deletedCount, long savedBytes) {
    }
}
