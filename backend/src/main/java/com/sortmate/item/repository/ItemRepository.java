package com.sortmate.item.repository;

import com.sortmate.item.entity.Item;
import com.sortmate.item.entity.ItemType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    Optional<Item> findByIdAndOwnerId(Long id, Long ownerId);

    /** 소유자 소유 아이템 일괄 조회(cleanup 썸네일/용량 조회, 존재 필터링용). */
    List<Item> findByOwnerIdAndIdIn(Long ownerId, java.util.Collection<Long> ids);

    long countByOwnerId(Long ownerId);

    /** 소유자의 전체 아이템(home 대시보드 집계·자연어 검색 인메모리 스캔용). */
    List<Item> findByOwnerId(Long ownerId);

    /** 관련 아이템: 같은 소유자·같은 카테고리, 자기 자신 제외, 최신순. */
    List<Item> findByOwnerIdAndCategoryAndIdNotOrderBySavedAtDesc(
            Long ownerId, String category, Long id, Pageable pageable);

    List<Item> findByOwnerIdAndTypeOrderBySavedAtDesc(Long ownerId, ItemType type, Pageable pageable);

    /** 카테고리 목록(ITEM-14): 소유자의 non-null 카테고리별 개수. */
    @Query("select i.category as name, count(i) as cnt from Item i " +
            "where i.ownerId = :ownerId and i.category is not null " +
            "group by i.category order by count(i) desc")
    List<CategoryCount> aggregateCategories(Long ownerId);

    interface CategoryCount {
        String getName();

        long getCnt();
    }
}
