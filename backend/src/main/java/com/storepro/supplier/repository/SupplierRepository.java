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

    @Query("SELECT s FROM Supplier s WHERE " +
           "(:search IS NULL OR LOWER(s.companyName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(s.tradeName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR s.cnpj LIKE CONCAT('%', :search, '%')) " +
           "AND (:active IS NULL OR s.active = :active)")
    Page<Supplier> findWithFilters(
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
