package com.storepro.customer.repository;

import com.storepro.customer.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByCpfCnpj(String cpfCnpj);
    boolean existsByCpfCnpj(String cpfCnpj);

    @Query(value = "SELECT c.* FROM customers c WHERE " +
           "(:search IS NULL OR unaccent(lower(c.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR c.cpf_cnpj LIKE '%' || cast(:search as text) || '%' " +
           "OR unaccent(lower(COALESCE(c.email, ''))) LIKE '%' || unaccent(lower(cast(:search as text))) || '%') " +
           "AND (cast(:active as boolean) IS NULL OR c.active = :active) " +
           "ORDER BY c.name",
           countQuery = "SELECT count(*) FROM customers c WHERE " +
           "(:search IS NULL OR unaccent(lower(c.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR c.cpf_cnpj LIKE '%' || cast(:search as text) || '%' " +
           "OR unaccent(lower(COALESCE(c.email, ''))) LIKE '%' || unaccent(lower(cast(:search as text))) || '%') " +
           "AND (cast(:active as boolean) IS NULL OR c.active = :active)",
           nativeQuery = true)
    Page<Customer> findWithFilters(@Param("search") String search, @Param("active") Boolean active, Pageable pageable);
}
