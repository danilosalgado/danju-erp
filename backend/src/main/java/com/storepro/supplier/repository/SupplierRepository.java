package com.storepro.supplier.repository;

import com.storepro.supplier.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    Optional<Supplier> findByCnpj(String cnpj);

    boolean existsByCnpj(String cnpj);

    @Query(value = "SELECT s.* FROM suppliers s WHERE " +
           "(:search IS NULL OR unaccent(lower(s.company_name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR unaccent(lower(COALESCE(s.trade_name, ''))) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR s.cnpj LIKE '%' || cast(:search as text) || '%') " +
           "AND (cast(:active as boolean) IS NULL OR s.active = :active) " +
           "ORDER BY s.company_name",
           countQuery = "SELECT count(*) FROM suppliers s WHERE " +
           "(:search IS NULL OR unaccent(lower(s.company_name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR unaccent(lower(COALESCE(s.trade_name, ''))) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR s.cnpj LIKE '%' || cast(:search as text) || '%') " +
           "AND (cast(:active as boolean) IS NULL OR s.active = :active)",
           nativeQuery = true)
    Page<Supplier> findWithFilters(
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
