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

    @Query("SELECT c FROM Customer c WHERE " +
           "(:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR c.cpfCnpj LIKE CONCAT('%', :search, '%') " +
           "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:active IS NULL OR c.active = :active)")
    Page<Customer> findWithFilters(@Param("search") String search, @Param("active") Boolean active, Pageable pageable);
}
