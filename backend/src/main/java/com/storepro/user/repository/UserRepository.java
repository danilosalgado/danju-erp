package com.storepro.user.repository;

import com.storepro.user.entity.User;
import com.storepro.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByPasswordResetToken(String token);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:active IS NULL OR u.active = :active)")
    Page<User> findWithFilters(
            @Param("search") String search,
            @Param("role") Role role,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
